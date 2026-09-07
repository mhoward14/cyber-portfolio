#!/usr/bin/env node
/**
 * Framework publication watcher.
 *
 * Runs biannually (see .github/workflows/check-framework-updates.yml) to
 * check whether NIST SP 800-53, CIS Controls, or ISO/IEC 27001 appear to
 * have published a new revision, and opens a GitHub issue if so.
 *
 * Design intent: NOTIFY, never auto-rewrite. A new revision can renumber
 * or split controls, and CIS/ISO's control text is copyrighted, so any
 * update to src/app/crosswalk/crosswalk-data.ts needs a human to read the
 * actual change and rewrite the (original, non-infringing) summaries
 * themselves. This script's only job is to make sure that review happens
 * instead of the data silently going stale.
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

async function main() {
  const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
  const frameworkNames = { nist: 'NIST SP 800-53', cis: 'CIS Controls', iso: 'ISO/IEC 27001' };

  const changed = [];
  const firstRun = [];
  const failed = [];

  for (const key of Object.keys(frameworkNames)) {
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
    console.log('No changes detected. All three framework page titles match the stored baseline.');
    return;
  }

  const sections = [];

  if (changed.length > 0) {
    sections.push(
      '## Possible new publication detected\n\n' +
        changed
          .map(
            (c) =>
              `### ${frameworkNames[c.key]}\n` +
              `- Source: ${c.url}\n` +
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
        'These frameworks have no stored baseline title yet (first run of this check, ' +
        'or the baseline file was reset). Nothing to compare against, so no action is ' +
        'required — this is informational only. To establish a baseline, copy the title ' +
        'shown below into the matching `pageTitle` field in `.github/framework-versions.json`.\n\n' +
        firstRun
          .map(
            (f) =>
              `### ${frameworkNames[f.key]}\n` +
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
        failed.map((f) => `### ${frameworkNames[f.key]}\n- Source: ${f.url}\n- Error: ${f.error}\n`).join('\n')
    );
  }

  sections.push(
    '---\n' +
      'This issue was opened automatically by the biannual framework-watch workflow. ' +
      'Once you\'ve reviewed the change (and updated `src/app/crosswalk/crosswalk-data.ts` ' +
      'if the crosswalk mappings need it), update `.github/framework-versions.json` with the ' +
      'new title(s) and close this issue — that resets the baseline so the next run only ' +
      'flags genuinely new changes.'
  );

  const body = sections.join('\n\n');
  const title = `Framework watch: ${[...changed, ...failed].map((x) => frameworkNames[x.key]).join(', ') || 'baseline update'}`;

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
