// ============================================================
// Engagement Mode demo recorder
// Drives the production build in a real browser through one scripted
// engagement (attack path, cloud settings, RMF baseline, report, SSP)
// and captures it as frames with their on-screen durations. Everything
// shown is fictional.
//
//   node tools/demo/record.mjs <build-dir> <out-dir>
//       -> <out-dir>/frames/*.png, <out-dir>/frames.json and
//          <out-dir>/poster.png
//   python3 tools/demo/assemble.py gif  <out-dir> <out.gif>
//   python3 tools/demo/assemble.py webm <out-dir> <out.webm>
//
// Both outputs come from the same frames, so they always match. A
// maintainer tool, not part of CI or the site build. It uses the
// playwright-core already in devDependencies; set A11Y_BROWSER to a
// Chromium executable, or have Google Chrome installed.
// ============================================================

import { createServer } from 'node:http';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { extname, join, resolve, sep } from 'node:path';
import { chromium } from 'playwright-core';

const [buildDir, outDir] = process.argv.slice(2);
if (!buildDir || !outDir) {
  console.error('Usage: node tools/demo/record.mjs <build-dir> <out-dir>');
  process.exit(2);
}
const root = resolve(buildDir);
const out = resolve(outDir);
mkdirSync(out, { recursive: true });

const BASE_PATH = '/cyber-portfolio/';
const SIZE = { width: 1280, height: 720 };
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.webp': 'image/webp', '.txt': 'text/plain' };

// A small static server for the build. It refuses any path outside the build directory.
const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  if (!path.startsWith(BASE_PATH)) return void res.writeHead(404).end();
  const file = resolve(join(root, path.slice(BASE_PATH.length) || 'index.html'));
  if (file !== root && !file.startsWith(root + sep)) return void res.writeHead(403).end();
  try {
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(readFileSync(file));
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const origin = `http://127.0.0.1:${server.address().port}${BASE_PATH}`;

const browser = await chromium.launch(process.env.A11Y_BROWSER ? { executablePath: process.env.A11Y_BROWSER } : { channel: 'chrome' });
const context = await browser.newContext({ viewport: SIZE, colorScheme: 'dark', reducedMotion: 'reduce' });
const page = await context.newPage();
await page.addInitScript(() => {
  try {
    localStorage.setItem('theme', 'dark');
    localStorage.setItem('engagement-tour-seen', 'true');
  } catch { /* storage unavailable */ }
});

const pause = (ms) => page.waitForTimeout(ms);

// On-screen furniture for the recording only: hide the floating profile buttons,
// and draw a caption bar and a click ring with the DOM API (no inline markup).
async function furniture() {
  await page.evaluate(() => {
    const hide = document.createElement('style');
    hide.textContent = '.top-nav, .skip-link { display: none !important; }';
    document.head.appendChild(hide);
    const bar = document.createElement('div');
    bar.id = 'demo-caption';
    Object.assign(bar.style, {
      position: 'fixed', left: '0', right: '0', bottom: '0', height: '46px', zIndex: '99998',
      display: 'flex', alignItems: 'center', gap: '12px', padding: '0 20px',
      background: 'rgba(8,12,28,0.94)', color: '#f8fafc', font: '700 17px system-ui, sans-serif',
      borderTop: '1px solid #263352',
    });
    const dot = document.createElement('span');
    dot.id = 'demo-dot';
    Object.assign(dot.style, { width: '26px', height: '26px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', font: '800 14px system-ui, sans-serif', color: '#fff' });
    const label = document.createElement('span');
    label.id = 'demo-label';
    bar.append(dot, label);
    document.body.appendChild(bar);
    const ring = document.createElement('div');
    ring.id = 'demo-ring';
    Object.assign(ring.style, { position: 'fixed', display: 'none', zIndex: '99999', pointerEvents: 'none', border: '3px solid #fbbf24', borderRadius: '10px', boxShadow: '0 0 0 4px rgba(251,191,36,0.25)' });
    document.body.appendChild(ring);
  });
}
const caption = (n, text, color) =>
  page.evaluate(([num, label, c]) => {
    document.getElementById('demo-dot').textContent = String(num);
    document.getElementById('demo-dot').style.background = c;
    document.getElementById('demo-label').textContent = label;
  }, [n, text, color]);

// Ring the target for a beat, click it, clear the ring.
async function tap(locator, { before = 550, after = 450 } = {}) {
  const el = locator.first();
  await el.scrollIntoViewIfNeeded();
  const box = await el.boundingBox();
  await page.evaluate((b) => {
    const r = document.getElementById('demo-ring');
    Object.assign(r.style, { display: 'block', left: `${b.x - 5}px`, top: `${b.y - 5}px`, width: `${b.width + 10}px`, height: `${b.height + 10}px` });
  }, box);
  await pause(before);
  await el.click();
  await page.evaluate(() => { document.getElementById('demo-ring').style.display = 'none'; });
  await pause(after);
}

async function scrollTo(y, ms = 900) {
  const steps = 18;
  const from = await page.evaluate(() => window.scrollY);
  for (let i = 1; i <= steps; i++) {
    await page.evaluate((top) => window.scrollTo(0, top), from + ((y - from) * i) / steps);
    await pause(ms / steps);
  }
}

async function goTo(hash) {
  // Move with the sidebar like a visitor would, then wait for the page.
  await tap(page.locator(`a.sidebar-link[href$="${hash}"]`), { before: 400, after: 500 });
  await page.waitForSelector('main h1, main .er-report-head, main .er-title');
}

const COLORS = { attack: '#0a84ff', cloud: '#f59e0b', rmf: '#a855f7', report: '#3b82f6', ssp: '#10b981' };

// ---------- the script ----------
await page.goto(`${origin}#/attack-path`, { waitUntil: 'networkidle' });
await page.waitForSelector('.ap-option');
await furniture();
let t0 = Date.now();

// Frame sampler: screenshot as fast as the browser allows, keep timestamps.
const frames = [];
let sampling = true;
const sampler = (async () => {
  while (sampling) {
    const at = Date.now() - t0;
    const png = await page.screenshot();
    frames.push({ at, png });
  }
})();

// Shot 1: attack path
await caption(1, 'Build an attack chain', COLORS.attack);
await pause(500);
for (let i = 0; i < 6; i++) await tap(page.locator('.ap-option'), { before: 300, after: 240 });
await pause(400);
await scrollTo(await page.evaluate(() => document.querySelector('.ap-engagement-btn').getBoundingClientRect().top + window.scrollY - 380));
await pause(700);
await tap(page.locator('.ap-engagement-btn'), { before: 450, after: 1100 });

// Shot 2: cloud settings
await caption(2, 'Fix the cloud settings', COLORS.cloud);
await goTo('/cloud-security');
await pause(500);
const cards = page.locator('.cs-resource-card');
for (let i = 0; i < 3; i++) {
  await tap(cards.nth(i).locator('.cs-resource-select'), { before: 250, after: 200 });
  await tap(cards.nth(i).locator('.cs-toggle-option').nth(1), { before: 250, after: 300 });
}
await pause(400);
await tap(page.locator('.ecp-btn').first(), { before: 500, after: 1200 });

// Shot 3: RMF baseline and POA&M
await caption(3, 'Controls become a baseline, gaps become POA&M items', COLORS.rmf);
await goTo('/rmf-tracker');
await page.waitForSelector('.rmf-engagement');
await pause(500);
await tap(page.locator('.rmf-eng-btn', { hasText: 'Import' }), { before: 500, after: 900 });
await tap(page.locator('.rmf-eng-btn', { hasText: /POA/ }), { before: 500, after: 1300 });

// Shot 4: the report
await caption(4, 'One engagement report', COLORS.report);
await goTo('/report');
await page.waitForSelector('#er-scenario');
await page.locator('#er-scenario').fill('Contoso Financial: phishing to ransomware');
await page.locator('#er-scenario').press('Enter');
await pause(700);
await page.screenshot({ path: join(out, 'poster.png') });
await scrollTo(380, 900);
await pause(700);
await scrollTo(900, 900);
await pause(1000);

// Shot 5: the SSP
await caption(5, 'A draft System Security Plan, from the same engagement', COLORS.ssp);
await goTo('/ssp');
await page.waitForSelector('.ssp-doc');
await pause(500);
await tap(page.getByRole('button', { name: 'Load the Contoso example' }), { before: 500, after: 600 });
await scrollTo(await page.evaluate(() => document.querySelector('.ssp-doc-panel').getBoundingClientRect().top + window.scrollY - 40), 800);
await pause(700);
await scrollTo(await page.evaluate(() => [...document.querySelectorAll('.ssp-h')].find((h) => h.textContent.includes('4.')).getBoundingClientRect().top + window.scrollY - 60), 1200);
await pause(1500);

// End card
await page.evaluate(() => {
  const card = document.createElement('div');
  Object.assign(card.style, { position: 'fixed', inset: '0', zIndex: '100000', background: '#0d1225', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '22px', color: '#f8fafc', font: '500 20px system-ui, sans-serif', textAlign: 'center' });
  const line = (text, style) => { const p = document.createElement('p'); p.textContent = text; Object.assign(p.style, { margin: '0' }, style); card.appendChild(p); };
  line('Engagement Mode', { font: '800 44px system-ui, sans-serif', color: '#60a5fa' });
  line('Attack  →  Defense  →  Controls  →  Risk  →  Plan', { color: '#e2e8f0' });
  line('mhoward14.github.io/cyber-portfolio', { font: '700 22px ui-monospace, monospace', marginTop: '18px' });
  line('Open “Report” and choose “Load a sample engagement”', { color: '#94a3b8', font: '500 17px system-ui, sans-serif' });
  document.body.appendChild(card);
});
await pause(2800);
sampling = false;
await sampler;

const dir = join(out, 'frames');
mkdirSync(dir, { recursive: true });
const kept = [];
let lastHash = '';
for (const f of frames) {
  const hash = createHash('sha1').update(f.png).digest('hex');
  if (hash === lastHash) continue; // identical neighbour: the earlier frame just lasts longer
  lastHash = hash;
  const name = `f${String(kept.length).padStart(4, '0')}.png`;
  writeFileSync(join(dir, name), f.png);
  kept.push({ name, at: f.at });
}
const total = Date.now() - t0;
const list = kept.map((k, i) => ({ name: k.name, ms: Math.max(60, (kept[i + 1]?.at ?? total) - k.at) }));
writeFileSync(join(out, 'frames.json'), JSON.stringify(list));
console.log(`${frames.length} samples, ${kept.length} distinct frames, ${(total / 1000).toFixed(1)} s`);
await context.close();
await browser.close();
server.close();
