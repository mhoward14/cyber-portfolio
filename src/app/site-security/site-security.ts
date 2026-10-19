/* ============================================================
   SITE-SECURITY.TS — HOW THIS SITE IS SECURED
   Every control on the page points at the file, workflow or setting
   that implements it, so a reviewer can check the claim instead of
   taking it on trust. A unit test confirms each linked path exists,
   so a rename can't leave a dead link behind.
   ============================================================ */

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

export const REPO_URL = 'https://github.com/mhoward14/cyber-portfolio';
export const SITE_URL = 'https://mhoward14.github.io/cyber-portfolio';

/** A place to check a control. Either a repo-relative path or a full URL. */
export interface Evidence {
  label: string;
  path?: string;
  url?: string;
}

export interface SecurityControl {
  name: string;
  what: string;
  stops: string;
  evidence: Evidence[];
}

export interface ControlGroup {
  id: string;
  title: string;
  blurb: string;
  controls: SecurityControl[];
}

export const CONTROL_GROUPS: ControlGroup[] = [
  {
    id: 'browser',
    title: 'In the browser',
    blurb:
      'This site is static: no server, accounts, cookies or back end, so everything a visitor does stays in their own browser. These controls cover the attacks that still apply.',
    controls: [
      {
        name: 'Content Security Policy',
        what: 'Scripts may load only from this site and Cloudflare Web Analytics. The policy allows no inline script, no inline event handlers, no plugins and no embedded frames.',
        stops: 'Script injection',
        evidence: [
          { label: 'The policy', path: 'src/index.html' },
          { label: 'The build check that enforces it', path: '.github/scripts/check-build-security.mjs' },
        ],
      },
      {
        name: 'Trusted Types',
        what: 'The browser rejects any plain string written into an HTML or script sink. Only Angular’s own sanitizing policies can create those values.',
        stops: 'DOM-based cross-site scripting',
        evidence: [{ label: 'The policy', path: 'src/index.html' }],
      },
      {
        name: 'Clickjacking guard',
        what: 'The app refuses to run inside another site’s frame and tries to break out of it. GitHub Pages can’t send X-Frame-Options or frame-ancestors, so this is done in code.',
        stops: 'Clickjacking',
        evidence: [{ label: 'The guard', path: 'src/app/security/frame-guard.ts' }],
      },
      {
        name: 'Validated links and storage',
        what: 'Share codes are length-capped, versioned and strictly decoded. Saved tool state is read back as untrusted input and checked against known keys and values.',
        stops: 'Malicious shared links and tampered local storage',
        evidence: [
          { label: 'Share-code decoding', path: 'src/app/share/share-link.ts' },
          { label: 'Stored-state validation', path: 'src/app/security/stored-state.ts' },
        ],
      },
      {
        name: 'Safe downloads',
        what: 'CSV cells that start with a formula character are prefixed so a spreadsheet shows them as text instead of running them.',
        stops: 'Spreadsheet formula injection',
        evidence: [{ label: 'The export code', path: 'src/app/share/export-file.ts' }],
      },
      {
        name: 'Local packet parsing',
        what: 'The Packet Analysis Lab decodes an uploaded capture in the browser with bounds-checked readers and a frame cap. Files are never uploaded.',
        stops: 'Hostile capture files',
        evidence: [{ label: 'The dissector', path: 'src/app/packet-lab/dissect.ts' }],
      },
      {
        name: 'Hidden contact address',
        what: 'The email address is assembled only when a visitor reaches for the link, so it isn’t in the page source or the JavaScript bundle.',
        stops: 'Address harvesting by scrapers',
        evidence: [{ label: 'The link code', path: 'src/app/security/email-link.ts' }],
      },
    ],
  },
  {
    id: 'pipeline',
    title: 'In the build and release',
    blurb:
      'Nothing reaches the live site without passing automated checks, and the checks themselves are locked down.',
    controls: [
      {
        name: 'Gated pull requests',
        what: 'Every change must pass a production-dependency audit, the full unit-test suite, a production build, the build security check and an accessibility scan before it can merge.',
        stops: 'Broken or insecure changes reaching the site',
        evidence: [{ label: 'The CI workflow', path: '.github/workflows/ci.yml' }],
      },
      {
        name: 'Build-output security check',
        what: 'A script reads the built page and fails the build if the policy is weakened, an inline script or handler appears, the frame guard is dropped or the contact address is exposed.',
        stops: 'A security control silently regressing',
        evidence: [{ label: 'The check', path: '.github/scripts/check-build-security.mjs' }],
      },
      {
        name: 'Static analysis',
        what: 'CodeQL runs its security-extended queries on the JavaScript and TypeScript code and on the workflow files themselves, on every pull request and weekly.',
        stops: 'Vulnerable code patterns',
        evidence: [{ label: 'The CodeQL workflow', path: '.github/workflows/codeql.yml' }],
      },
      {
        name: 'Dependency control',
        what: 'Pull requests get a dependency review, and Dependabot proposes grouped weekly updates with rules that keep versions inside what the framework supports.',
        stops: 'Vulnerable or incompatible dependencies',
        evidence: [
          { label: 'The Dependabot policy', path: '.github/dependabot.yml' },
          { label: 'The CI workflow', path: '.github/workflows/ci.yml' },
        ],
      },
      {
        name: 'Pinned, least-privilege workflows',
        what: 'Every GitHub Action is pinned to a full commit ID, and each workflow job gets only the permissions it needs.',
        stops: 'Supply-chain compromise through a build step',
        evidence: [{ label: 'The workflows', path: '.github/workflows' }],
      },
      {
        name: 'Protected main branch',
        what: 'Changes reach the main branch only through a pull request with the required checks passing. Force-pushes and branch deletion are blocked.',
        stops: 'Unreviewed or unchecked changes',
        evidence: [{ label: 'The repository rules', url: `${REPO_URL}/rules` }],
      },
      {
        name: 'Software bill of materials and signed provenance',
        what: 'Each deploy publishes a CycloneDX bill of materials that lists every dependency and marks which ones ship in the app, and signs a build-provenance attestation for every file on the site, so a file can be checked against the build that made it.',
        stops: 'Not knowing what is in the build, or where a file came from',
        evidence: [
          { label: 'The deploy workflow', path: '.github/workflows/deploy.yml' },
          { label: 'The bill of materials', url: `${SITE_URL}/sbom.cdx.json` },
        ],
      },
      {
        name: 'Vulnerability disclosure',
        what: 'A security.txt file (RFC 9116) at the root of this host and a SECURITY.md tell a researcher how to report a problem privately, through GitHub’s private reporting form. The file expires every six months, and the repository that holds it checks it in CI and warns 30 days ahead.',
        stops: 'Reports with nowhere to go, or going public first',
        evidence: [
          { label: 'The disclosure policy', path: 'SECURITY.md' },
          { label: 'The security.txt file', url: 'https://mhoward14.github.io/.well-known/security.txt' },
        ],
      },
      {
        name: 'Independent scoring',
        what: 'OpenSSF Scorecard scores the repository’s supply-chain practices every week and publishes the result.',
        stops: 'Practices drifting without anyone noticing',
        evidence: [
          { label: 'The Scorecard workflow', path: '.github/workflows/scorecard.yml' },
          { label: 'The published score', url: 'https://scorecard.dev/viewer/?uri=github.com/mhoward14/cyber-portfolio' },
        ],
      },
    ],
  },
];

/** What this setup does not do. Stated plainly so the claims above stay honest. */
export const KNOWN_LIMITS: string[] = [
  'The policy is delivered in a meta tag, which browsers treat as weaker than a real HTTP header. GitHub Pages can’t send custom headers, so protections like X-Content-Type-Options and Permissions-Policy aren’t available.',
  'Angular’s component styles need style-src to allow inline styles. Scripts do not.',
  'One third-party script remains, Cloudflare Web Analytics. It can’t carry a Subresource Integrity hash because it is served from a versionless address. The policy limits it to its own host, and Trusted Types limits what it could do to the page.',
  'A signed attestation shows where a file was built and from which commit. It does not prove the code has no bugs.',
  'There is one maintainer, so pull requests can’t require another person’s approval, and Scorecard’s code-review check scores low for that reason.',
];

/** Commands a visitor can run to check the published bill of materials against its signed provenance. */
export const VERIFY_COMMANDS = `curl -sO ${SITE_URL}/sbom.cdx.json
gh attestation verify sbom.cdx.json --repo mhoward14/cyber-portfolio`;

@Component({
  selector: 'app-site-security',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: true,
  imports: [RouterLink],
  templateUrl: './site-security.html',
  styleUrl: './site-security.css',
})
export class SiteSecurity {
  readonly groups = CONTROL_GROUPS;
  readonly limits = KNOWN_LIMITS;
  readonly verifyCommands = VERIFY_COMMANDS;
  readonly repoUrl = REPO_URL;
  readonly siteUrl = SITE_URL;

  /** The address a piece of evidence links to. */
  href(e: Evidence): string {
    if (e.url) return e.url;
    const path = e.path ?? '';
    // A folder opens as a tree, a file as a blob.
    const kind = /\.[a-z0-9]+$/i.test(path) ? 'blob' : 'tree';
    return `${REPO_URL}/${kind}/master/${path}`;
  }
}
