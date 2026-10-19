// ============================================================
// Accessibility check
// Fails CI when a page of the built site breaks an automated
// WCAG 2.2 AA rule (or one of axe-core's best-practice rules). It
// serves the production build locally, opens every page in a real
// browser in the dark and light themes at desktop and phone widths,
// and runs axe-core on each.
//
// This catches contrast, missing labels, heading and landmark
// problems, and bad ARIA. It does not replace the manual keyboard
// and screen-reader checks described in ACCESSIBILITY.md, and it
// sees each page as it loads, plus the few states listed in STATES
// below, not every dialog and result a visitor can open afterward.
//
// Usage: node .github/scripts/check-accessibility.mjs <build-dir>
// Set A11Y_BROWSER to a Chromium executable to use it instead of
// the Google Chrome that GitHub-hosted runners already have.
// ============================================================

import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { extname, join, resolve, sep } from 'node:path';
import { chromium } from 'playwright-core';

const dir = process.argv[2];
if (!dir) {
  console.error('usage: check-accessibility.mjs <build-dir>');
  process.exit(2);
}

const root = resolve(dir);
// Matches "baseHref" in angular.json: the app is served under this path.
const BASE_PATH = '/cyber-portfolio/';
const ROUTES = ['', 'attack-path', 'cloud-security', 'incident-response', 'zero-trust', 'rmf-tracker', 'crosswalk', 'transaction-security', 'devops-pipeline', 'packet-lab', 'vuln-priority', 'risk-register', 'ssp', 'report', 'role-guide', 'site-security', 'notes'];
// Pages whose content only appears after an action, scanned in that state too.
const STATES = [
  { route: 'ssp', name: 'with the example', setup: (page) => page.getByRole('button', { name: 'Load the Contoso example' }).click() },
  { route: 'risk-register', name: 'with risks', setup: (page) => page.getByRole('button', { name: 'Load fictional examples' }).click() },
  { route: 'report', name: 'sample engagement', setup: (page) => page.getByRole('button', { name: 'Load a sample engagement' }).click() },
  { route: 'vuln-priority', name: 'with findings', setup: (page) => page.getByRole('button', { name: 'Load fictional examples' }).click() },
];
const THEMES = ['dark', 'light'];
const VIEWPORTS = { desktop: { width: 1280, height: 900 }, phone: { width: 390, height: 844 } };
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2', '.txt': 'text/plain' };

const axeSource = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');

// A small static server for the build. It refuses any path outside the build directory.
const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  if (!path.startsWith(BASE_PATH)) {
    res.writeHead(404).end();
    return;
  }
  const file = resolve(join(root, path.slice(BASE_PATH.length) || 'index.html'));
  if (file !== root && !file.startsWith(root + sep)) {
    res.writeHead(403).end();
    return;
  }
  try {
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(readFileSync(file));
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const origin = `http://127.0.0.1:${server.address().port}${BASE_PATH}`;

const browser = await chromium.launch(process.env.A11Y_BROWSER ? { executablePath: process.env.A11Y_BROWSER } : { channel: 'chrome' });
const problems = [];

for (const [viewportName, viewport] of Object.entries(VIEWPORTS)) {
  for (const theme of THEMES) {
    const context = await browser.newContext({ viewport, colorScheme: theme, reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.addInitScript((value) => {
      try {
        localStorage.setItem('theme', value);
        // Keep the first-visit guided tour from opening over the page.
        localStorage.setItem('engagement-tour-seen', 'true');
      } catch {
        /* storage unavailable: the page still renders */
      }
    }, theme);
    for (const route of ROUTES) {
      const label = `${route || 'home'} (${theme}, ${viewportName})`;
      await page.goto(origin + (route ? `#/${route}` : ''), { waitUntil: 'networkidle' });
      await page.waitForSelector('main h1');
      await page.evaluate(axeSource);
      const { violations } = await page.evaluate(
        (tags) => axe.run(document, { runOnly: { type: 'tag', values: tags }, resultTypes: ['violations'] }),
        TAGS,
      );
      for (const v of violations) {
        problems.push(`${label}: ${v.id} (${v.impact}): ${v.help}\n    ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join('\n    ')}`);
      }
      console.log(`${violations.length ? 'FAIL' : 'ok  '} ${label}`);
    }
    for (const state of STATES) {
      const label = `${state.route} ${state.name} (${theme}, ${viewportName})`;
      await page.goto(origin + `#/${state.route}`, { waitUntil: 'networkidle' });
      await page.waitForSelector('main h1');
      await state.setup(page);
      await page.evaluate(axeSource);
      const { violations } = await page.evaluate(
        (tags) => axe.run(document, { runOnly: { type: 'tag', values: tags }, resultTypes: ['violations'] }),
        TAGS,
      );
      for (const v of violations) {
        problems.push(`${label}: ${v.id} (${v.impact}): ${v.help}\n    ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join('\n    ')}`);
      }
      console.log(`${violations.length ? 'FAIL' : 'ok  '} ${label}`);
    }
    await context.close();
  }
}

await browser.close();
server.close();

if (problems.length) {
  console.error(`\n${problems.length} accessibility problem(s):\n`);
  for (const p of problems) console.error(`- ${p}`);
  process.exit(1);
}
console.log(`\nAccessibility check passed: ${ROUTES.length} pages and ${STATES.length} interactive states, ${THEMES.length} themes, ${Object.keys(VIEWPORTS).length} widths.`);
