/* ============================================================
   NOTES.TS — ENGINEERING NOTES
   Short write-ups of real problems hit while running this site:
   what happened, why, and what changed. Each links to the commit
   or file so the account can be checked.
   ============================================================ */

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { REPO_URL } from '../site-security/site-security';

export interface NoteLink {
  label: string;
  /** Repo-relative path, or a commit hash when `commit` is true. */
  ref: string;
  commit?: boolean;
}

export interface Note {
  id: string;
  title: string;
  summary: string;
  /** Paragraph-level sections, in reading order. */
  sections: { heading: string; body: string[] }[];
  links: NoteLink[];
}

export const NOTES: Note[] = [
  {
    id: 'dependency-merges',
    title: 'Green pull requests that broke the build',
    summary: 'Automated dependency updates passed their checks, then failed once merged. What I changed so it stops happening.',
    sections: [
      {
        heading: 'What happened',
        body: [
          'Dependabot opened a TypeScript 7 update and a jsdom 30 update. I merged both. The deploy then failed at npm ci with a peer-dependency conflict: the Angular build tools in use declare TypeScript “>=6.0 <6.1”, and TypeScript 7 is outside that range.',
          'The same thing happened twice more in smaller form. Vitest 5 asked for @types/node 22 or 24 and above, while the project pinned 20. A bump to @types/node 26 merged cleanly, but CI and deploy run Node 22, so those type definitions described APIs the runtime does not have.',
        ],
      },
      {
        heading: 'Impact',
        body: [
          'The live site was never down. The build failed before the upload and deploy steps ran, so visitors kept getting the last good release. But the main branch could no longer build, and every later pull request would have failed its checks.',
        ],
      },
      {
        heading: 'Why the checks did not catch it',
        body: [
          'Each update was tested on its own branch against the dependencies at that time. Two of them merged close together, and a version that is fine alone can fall outside a framework’s supported range once its neighbours move. A passing check says the change works today, not that it fits the framework’s support policy.',
        ],
      },
      {
        heading: 'What I changed',
        body: [
          'I put TypeScript back on 6.0 and told Dependabot to ignore TypeScript major and minor updates until an Angular release widens the supported range. Patch updates still flow. I did the same for @types/node major versions, tied to the Node version in .nvmrc, and added a note to raise the two together.',
          'Each fix was verified from a clean install on the same Node version CI uses, then the full test suite, a production build and the build security check.',
        ],
      },
    ],
    links: [
      { label: 'TypeScript rollback and ignore rule', ref: 'fb473fb', commit: true },
      { label: 'Vitest and @types/node alignment', ref: 'e7e8fc0', commit: true },
      { label: 'Dependabot policy', ref: '.github/dependabot.yml' },
    ],
  },
  {
    id: 'codeql-alert',
    title: 'Triaging a CodeQL alert instead of dismissing it',
    summary: 'A medium-severity alert on a maintenance script. The risk was small; the fix was smaller.',
    sections: [
      {
        heading: 'The alert',
        body: [
          'CodeQL flagged js/file-access-to-http (medium) in the script that watches framework release pages. It read each URL out of a JSON file in the repository and passed it to fetch(), so file contents decided where an outbound request went.',
        ],
      },
      {
        heading: 'Is it real?',
        body: [
          'Reaching it required changing a file in the repository, and changes go through a protected branch and review checks, so the practical risk was low. But the pattern is the one that becomes a server-side request forgery bug if a script like this is ever reused with input that is not trusted, and the data/code boundary was easy to draw correctly.',
        ],
      },
      {
        heading: 'The fix',
        body: [
          'The URLs now live in a constant inside the script, and the JSON file keeps only the last-seen page titles. Behavior is unchanged. I checked it against a stubbed fetch: ten page fetches, then the issue lookup and issue creation. The alert closed as fixed, not dismissed.',
        ],
      },
      {
        heading: 'Takeaway',
        body: [
          'When the fix costs a few lines, I fix the pattern rather than argue the alert is a false positive. A dismissal needs a justification someone has to trust; a fix does not.',
        ],
      },
    ],
    links: [
      { label: 'The fix', ref: '9bb5cc7', commit: true },
      { label: 'The script', ref: '.github/scripts/check-framework-updates.mjs' },
      { label: 'CodeQL workflow', ref: '.github/workflows/codeql.yml' },
    ],
  },
  {
    id: 'meta-csp',
    title: 'Why a meta-tag CSP is weaker than a header, and what I did about it',
    summary: 'GitHub Pages cannot send HTTP headers. Here is what that gives up and how this site compensates.',
    sections: [
      {
        heading: 'The constraint',
        body: [
          'GitHub Pages serves static files and offers no way to set response headers. A Content Security Policy normally travels in a header, so this site delivers its policy in a meta tag instead.',
        ],
      },
      {
        heading: 'What a meta tag cannot do',
        body: [
          'Browsers ignore the frame-ancestors, report-uri and sandbox directives when the policy arrives in a meta tag, and the policy only covers content that loads after the tag. X-Frame-Options, X-Content-Type-Options and Permissions-Policy cannot be set at all. The missing frame-ancestors is the one that matters most, because it is what stops other sites from embedding the page.',
        ],
      },
      {
        heading: 'How the site compensates',
        body: [
          'The policy allows no inline script, no inline event handlers and no plugins. Trusted Types blocks plain strings from reaching HTML and script sinks. A small piece of code in the app checks whether it is running inside another site’s frame; if it is, the app does not start, tries to take over the top window and shows only a link to open the site directly.',
          'Because a security setting that nobody tests tends to erode, a build check reads the built page and fails the build if the policy is weakened, an inline script appears or the frame guard is dropped.',
        ],
      },
      {
        heading: 'What would remove the gap',
        body: [
          'Serving the site through a proxy that can add headers, such as a CDN in front of a custom domain, would allow a real header policy. Until then, the page on this site lists the limits openly next to the controls.',
        ],
      },
    ],
    links: [
      { label: 'The policy and Trusted Types', ref: 'src/index.html' },
      { label: 'The frame guard', ref: 'src/app/security/frame-guard.ts' },
      { label: 'The build check', ref: '.github/scripts/check-build-security.mjs' },
    ],
  },
];

@Component({
  selector: 'app-notes',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: true,
  imports: [RouterLink],
  templateUrl: './notes.html',
  styleUrl: './notes.css',
})
export class Notes {
  readonly notes = NOTES;

  /** The address a link points at: a commit, a file or a folder on the main branch. */
  href(l: NoteLink): string {
    if (l.commit) return `${REPO_URL}/commit/${l.ref}`;
    const kind = /\.[a-z0-9]+$/i.test(l.ref) ? 'blob' : 'tree';
    return `${REPO_URL}/${kind}/master/${l.ref}`;
  }
}
