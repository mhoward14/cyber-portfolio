#!/usr/bin/env node
/**
 * Framework & reference publication watcher.
 *
 * Runs biannually (see .github/workflows/check-framework-updates.yml) to
 * check whether NIST SP 800-53, CIS Controls, ISO/IEC 27001, NIST SP 800-207,
 * or the DoD Zero Trust Strategy appear to have published a new revision, and
 * opens a GitHub issue if so. Covers both the Crosswalk tool's frameworks and
 * the Zero Trust Explorer's sources with one unified check.
 *
 * Design intent: NOTIFY, never auto-rewrite. A new revision can renumber or
 * split controls/pillars, and CIS/ISO's control text is copyrighted, so any
 * update to the affected data file (see the FRAMEWORKS map below for which
 * file goes with which source) needs a human to read the actual change and
 * rewrite the (original, non-infringing) content themselves. This script's
 * only job is to make sure that review happens instead of the data silently
 * going stale.
 *
 * Detection strategy: each publisher's page can be redesigned at any time,
 * so rather than depending on a fragile per-site regex against page markup
 * (which breaks silently on a layout change), we track the page's <title>
 * text as a simple, redesign-resistant "did something change" signal —
 * publishers update their <title> when the document itself changes, even
 * if they restyle the surrounding page. A best-effort version-token
 * extraction is included in the issue for a head start, but the title
 * comparison is what actually decides whether to flag anything.
 */

import { readFileSync } from 'node:fs';

const BASELINE_PATH = new URL('../framework-versions.json', import.meta.url);
const ISSUE_LABEL = 'framework-watch';

const VERSION_TOKEN_PATTERNS = {
  nist: /Rev(?:ision)?\.?\s*(\d+)/i,
  cis: /v(\d+(?:\.\d+)?)/i,
  iso: /27001:(\d{4})/i
};

async function fetchTitle(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'cyber-portfolio-framework-watch/1.0' },
    redirect: 'follow'
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }
  const html = await res.text();
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  if (!match) {
    throw new Error('no <title> tag found in response');
  }
  return match[1].trim();
}

function extractVersionToken(key, title) {
  const pattern = VERSION_TOKEN_PATTERNS[key];
  const match = title.match(pattern);
  return match ? match[0] : '(no recognizable version token in title)';
}

async function githubApi(path, options = {}) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY;
  const res = await fetch(`https://api.github.com/repos/${repo}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.headers || {})
    }
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub API ${path} -> HTTP ${res.status}: ${body}`);
  }
  return res.status === 204 ? null : res.json();
}

async function findOpenWatchIssue() {
  const issues = await githubApi(`/issues?state=open&labels=${ISSUE_LABEL}&per_page=10`);
  return issues.find((issue) => !issue.pull_request) || null;
}

const FRAMEWORKS = {
  nist: { name: 'NIST SP 800-53', dataFile: 'src/app/crosswalk/crosswalk-data.ts' },
  cis: { name: 'CIS Controls', dataFile: 'src/app/crosswalk/crosswalk-data.ts' },
  iso: { name: 'ISO/IEC 27001', dataFile: 'src/app/crosswalk/crosswalk-data.ts' },
  nist80207: { name: 'NIST SP 800-207 (Zero Trust Architecture)', dataFile: 'src/app/zero-trust/zero-trust-data.ts' },
  dod: { name: 'DoD Zero Trust Strategy', dataFile: 'src/app/zero-trust/zero-trust-data.ts' }
};

async function main() {
  const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));

  const changed = [];
  const firstRun = [];
  const failed = [];

  for (const key of Object.keys(FRAMEWORKS)) {
    const entry = baseline[key];
    try {
      const title = await fetchTitle(entry.url);
      const versionToken = extractVersionToken(key, title);

      if (!entry.pageTitle) {
        firstRun.push({ key, url: entry.url, title, versionToken });
      } else if (entry.pageTitle !== title) {
        changed.push({
          key,
          url: entry.url,
          oldTitle: entry.pageTitle,
          newTitle: title,
          versionToken
        });
      }
    } catch (err) {
      failed.push({ key, url: entry.url, error: err.message });
    }
  }

  if (changed.length === 0 && firstRun.length === 0 && failed.length === 0) {
    console.log('No changes detected. All watched page titles match the stored baseline.');
    return;
  }

  const sections = [];

  if (changed.length > 0) {
    sections.push(
      '## Possible new publication detected\n\n' +
        changed
          .map(
            (c) =>
              `### ${FRAMEWORKS[c.key].name}\n` +
              `- Source: ${c.url}\n` +
              `- Data file to review: \`${FRAMEWORKS[c.key].dataFile}\`\n` +
              `- Previously seen title: "${c.oldTitle}"\n` +
              `- Currently seen title: "${c.newTitle}"\n` +
              `- Extracted version token: ${c.versionToken}\n`
          )
          .join('\n')
    );
  }

  if (firstRun.length > 0) {
    sections.push(
      '## Baseline not yet established\n\n' +
        'These sources have no stored baseline title yet (first run of this check, ' +
        'or the baseline file was reset). Nothing to compare against, so no action is ' +
        'required — this is informational only. To establish a baseline, copy the title ' +
        'shown below into the matching `pageTitle` field in `.github/framework-versions.json`.\n\n' +
        firstRun
          .map(
            (f) =>
              `### ${FRAMEWORKS[f.key].name}\n` +
              `- Source: ${f.url}\n` +
              `- Current title: "${f.title}"\n` +
              `- Extracted version token: ${f.versionToken}\n`
          )
          .join('\n')
    );
  }

  if (failed.length > 0) {
    sections.push(
      '## Check failed\n\n' +
        "Couldn't fetch or parse one or more source pages — this usually means the " +
        'publisher redesigned their page and the detection logic in ' +
        '`.github/scripts/check-framework-updates.mjs` needs a small update, or the ' +
        'page moved. Worth a manual look either way.\n\n' +
        failed.map((f) => `### ${FRAMEWORKS[f.key].name}\n- Source: ${f.url}\n- Error: ${f.error}\n`).join('\n')
    );
  }

  sections.push(
    '---\n' +
      'This issue was opened automatically by the biannual publication-watch workflow. ' +
      'Once you\'ve reviewed the change and updated the relevant data file (linked above) if ' +
      'needed, update `.github/framework-versions.json` with the new title(s) and close this ' +
      'issue — that resets the baseline so the next run only flags genuinely new changes.'
  );

  const body = sections.join('\n\n');
  const title = `Framework watch: ${[...changed, ...failed].map((x) => FRAMEWORKS[x.key].name).join(', ') || 'baseline update'}`;

  const existing = await findOpenWatchIssue();
  if (existing) {
    console.log(`Open framework-watch issue #${existing.number} already exists — commenting instead of opening a duplicate.`);
    await githubApi(`/issues/${existing.number}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body })
    });
  } else {
    console.log('Opening a new framework-watch issue.');
    await githubApi('/issues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body, labels: [ISSUE_LABEL] })
    });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
