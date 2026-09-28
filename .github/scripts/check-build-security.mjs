// ============================================================
// Build security check
// Fails CI when the production build loses any of the hardening in
// SECURITY.md: the Content Security Policy is missing or weakened
// (including Trusted Types or the frame-src lockdown),
// an inline event handler or inline script appears (for example,
// from re-enabling Angular's critical-CSS inlining), the frame guard
// is dropped from the bundle, or the contact address shows up as
// plain text for scrapers.
//
// Usage: node .github/scripts/check-build-security.mjs <build-dir>
// ============================================================

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2];
if (!dir) {
  console.error('usage: check-build-security.mjs <build-dir>');
  process.exit(2);
}

const failures = [];
const fail = (msg) => failures.push(msg);

const html = readFileSync(join(dir, 'index.html'), 'utf8');

// 1. The CSP is present and strict.
const csp = html.match(/<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"/i)?.[1];
if (!csp) {
  fail('index.html has no Content-Security-Policy meta tag');
} else {
  const directives = Object.fromEntries(
    csp.split(';').map((d) => d.trim()).filter(Boolean).map((d) => {
      const [name, ...values] = d.split(/\s+/);
      return [name, values];
    }),
  );
  const scriptSrc = directives['script-src'] ?? directives['default-src'] ?? [];
  for (const bad of ["'unsafe-inline'", "'unsafe-eval'", "'unsafe-hashes'", '*', 'data:', 'http:', 'https:']) {
    if (scriptSrc.includes(bad)) fail(`script-src allows ${bad}`);
  }
  if (scriptSrc.some((v) => v.startsWith("'sha") || v.startsWith("'nonce-"))) fail('script-src allows inline script by hash or nonce');
  for (const [name, want] of [
    ['object-src', "'none'"],
    ['base-uri', "'self'"],
    ['form-action', "'none'"],
    ['frame-src', "'none'"],
    ['require-trusted-types-for', "'script'"],
  ]) {
    if (directives[name]?.join(' ') !== want) fail(`${name} should be ${want}, found ${directives[name]?.join(' ') ?? 'nothing'}`);
  }
}

// 2. No inline event handlers or inline executable scripts.
const handlers = html.match(/<[^>]+\son[a-z]+\s*=/gi);
if (handlers) fail(`inline event handler(s) in index.html: ${handlers.map((h) => h.slice(0, 60)).join(' | ')}`);
for (const tag of html.match(/<script\b[^>]*>/gi) ?? []) {
  if (!/\bsrc=/i.test(tag) && !/type=["']application\/ld\+json["']/i.test(tag)) fail(`inline script in index.html: ${tag}`);
}

// 3. The frame guard ships in the bundle, and the email address doesn't appear as text.
const files = readdirSync(dir).filter((f) => /\.(html|js)$/.test(f));
const texts = files.map((f) => [f, readFileSync(join(dir, f), 'utf8')]);
if (!texts.some(([, t]) => t.includes('shown inside another site'))) fail('frame guard notice not found in any bundle');
for (const [f, t] of texts) {
  if (/mhoward14@|mailto:m/i.test(t)) fail(`${f} contains the contact address as plain text`);
}

if (failures.length) {
  console.error(`Build security check failed (${failures.length}):`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`Build security check passed: CSP strict, no inline handlers or scripts, frame guard present, address not exposed (${files.length} files).`);
