/* ============================================================
   SHARE-LINK.TS — SHAREABLE TOOL RESULTS
   A tool's current choices, encoded into its own URL
   (…/#/cloud-security?s=c1.0.EAs) so a visitor can send someone the
   exact configuration they built. Codes are compact, versioned per
   tool, and strictly validated on the way in; anything unrecognized
   is ignored and the page opens normally with a short notice.

   Opening a shared link never overwrites the visitor's own saved work:
   the tool shows the shared state without saving it until the visitor
   chooses "Keep as mine" (or goes "Back to my own").
   ============================================================ */

import { Component, ChangeDetectionStrategy, computed, inject, input, output, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

export const SHARE_PARAM = 's';

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/** Pack small integers (each < 2^bits) into URL-safe base64. */
export function packValues(values: number[], bits: number): string {
  let out = '';
  let acc = 0;
  let accBits = 0;
  for (const v of values) {
    acc = (acc << bits) | (v & ((1 << bits) - 1));
    accBits += bits;
    while (accBits >= 6) {
      accBits -= 6;
      out += B64[(acc >> accBits) & 63];
    }
    acc &= (1 << accBits) - 1;
  }
  if (accBits > 0) out += B64[(acc << (6 - accBits)) & 63];
  return out;
}

/** Inverse of packValues. Returns null for malformed input or a length
 *  that does not match `count`. */
export function unpackValues(text: string, bits: number, count: number): number[] | null {
  if (text.length !== Math.ceil((count * bits) / 6)) return null;
  const values: number[] = [];
  let acc = 0;
  let accBits = 0;
  for (const ch of text) {
    const n = B64.indexOf(ch);
    if (n < 0) return null;
    acc = (acc << 6) | n;
    accBits += 6;
    while (accBits >= bits && values.length < count) {
      accBits -= bits;
      values.push((acc >> accBits) & ((1 << bits) - 1));
    }
    acc &= (1 << accBits) - 1;
  }
  return values.length === count ? values : null;
}

/** Split a versioned code ("c1.0.EAs") into its parts, or null when the
 *  prefix or part count is wrong. */
export function splitCode(code: string, prefix: string, parts: number): string[] | null {
  if (code.length > 400) return null;
  const segments = code.split('.');
  if (segments[0] !== prefix || segments.length !== parts + 1) return null;
  return segments.slice(1);
}

/** The full link for a tool route and code, on whatever host serves the site. */
export function shareUrl(route: string, code: string): string {
  if (typeof location === 'undefined') return `#${route}?${SHARE_PARAM}=${code}`;
  return `${location.origin}${location.pathname}#${route}?${SHARE_PARAM}=${encodeURIComponent(code)}`;
}

/** Per-tool share state: the incoming code (read once, at creation), and
 *  whether the tool is currently showing someone else's shared result. */
export class ShareSession {
  private readonly route = inject(ActivatedRoute, { optional: true });
  private readonly router = inject(Router, { optional: true });

  /** The `?s=` code the page was opened with, if any. */
  readonly incoming: string | null = this.route?.snapshot.queryParamMap.get(SHARE_PARAM) ?? null;
  /** True while showing a shared result that has not been kept. */
  readonly viewing = signal(false);
  /** True when the page was opened with a code that could not be read. */
  readonly invalid = signal(false);

  /** Apply the incoming code with the tool's decoder. */
  open(apply: (code: string) => boolean) {
    if (!this.incoming) return;
    if (apply(this.incoming)) this.viewing.set(true);
    else this.invalid.set(true);
  }

  /** Leave shared mode and drop the code from the address bar. */
  close() {
    this.viewing.set(false);
    this.invalid.set(false);
    this.router?.navigate([], { queryParams: { [SHARE_PARAM]: null }, queryParamsHandling: 'merge', replaceUrl: true });
  }
}

/** Notice shown while a tool displays a shared result. */
@Component({
  selector: 'app-share-banner',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: true,
  template: `
    @if (session().viewing()) {
      <aside class="sb" [style.--sb-accent]="accent()" aria-label="Shared link">
        <div class="sb-body">
          <span class="sb-label">// SHARED LINK</span>
          <p>You're viewing {{ what() }} someone shared. {{ note() }} {{ keepable() ? 'Your own saved work in this tool is untouched unless you keep this.' : '' }}</p>
        </div>
        <div class="sb-actions">
          @if (keepable()) {
            <button type="button" class="sb-btn sb-primary" (click)="keep.emit()">Keep as mine</button>
          }
          <button type="button" class="sb-btn" (click)="discard.emit()">{{ keepable() ? 'Back to my own' : 'Start my own' }}</button>
        </div>
      </aside>
    } @else if (session().invalid()) {
      <div class="sb sb-invalid" [style.--sb-accent]="accent()" role="status">
        <div class="sb-body">
          <span class="sb-label">// SHARED LINK</span>
          <p>This shared link couldn't be read. It may be incomplete or from an older version of the tool, so the page opened normally.</p>
        </div>
        <div class="sb-actions">
          <button type="button" class="sb-btn" (click)="session().close()" aria-label="Dismiss">Dismiss</button>
        </div>
      </div>
    }
  `,
  styles: `
    .sb {
      --sb-accent: var(--color-accent);
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem 1.25rem;
      max-width: 900px;
      margin: 0 auto 1.5rem;
      padding: 0.85rem 1.1rem;
      border: 1px solid color-mix(in srgb, var(--sb-accent) 45%, var(--color-border));
      border-left: 3px solid var(--sb-accent);
      border-radius: var(--radius-md);
      background: color-mix(in srgb, var(--sb-accent) 8%, var(--color-surface));
    }
    .sb-invalid { border-left-color: #f59e0b; }
    .sb-body { flex: 1 1 320px; }
    .sb p { margin: 0.3rem 0 0; line-height: 1.55; color: var(--color-text-muted); font-size: 0.88rem; }
    .sb-label {
      font-family: var(--font-mono);
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      color: var(--sb-accent);
    }
    :host-context(.light-mode) .sb-label { color: var(--color-text); }
    .sb-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .sb-btn {
      padding: 0.5rem 0.9rem;
      border: 1px solid var(--color-border-2);
      border-radius: var(--radius-md);
      background: transparent;
      color: var(--color-text);
      font: inherit;
      font-size: 0.8rem;
      font-weight: 700;
      cursor: pointer;
    }
    .sb-btn:hover { border-color: var(--sb-accent); }
    .sb-primary { background: color-mix(in srgb, var(--sb-accent) 22%, transparent); border-color: var(--sb-accent); }
    .sb-primary:hover { background: color-mix(in srgb, var(--sb-accent) 32%, transparent); }
    .sb-btn:focus-visible { outline: 2px solid var(--sb-accent); outline-offset: 2px; }
  `,
})
export class ShareBanner {
  readonly session = input.required<ShareSession>();
  readonly accent = input('var(--color-accent)');
  /** What is being shown, e.g. "an attack path". */
  readonly what = input('a result');
  /** Optional sentence about what the link does or does not carry. */
  readonly note = input('');
  /** False for tools with nothing saved to protect (the shared result simply replaces the view). */
  readonly keepable = input(true);
  readonly keep = output<void>();
  readonly discard = output<void>();
}

/** "Copy share link" button with a fallback field when the clipboard is unavailable. */
@Component({
  selector: 'app-share-button',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: true,
  template: `
    <span class="sh" [style.--sh-accent]="accent()">
      <button type="button" class="sh-btn" (click)="copy()" [disabled]="!code()">
        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5"></path>
          <path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5"></path>
        </svg>
        {{ label() }}
      </button>
      <span class="sh-status" aria-live="polite">{{ status() }}</span>
      @if (fallback()) {
        <input class="sh-field" type="text" readonly [value]="url()" aria-label="Share link" (focus)="$any($event.target).select()" />
      }
    </span>
  `,
  styles: `
    .sh { --sh-accent: var(--color-accent); display: inline-flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; }
    .sh-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.55rem 1rem;
      border: 1px solid var(--sh-accent);
      border-radius: var(--radius-md);
      background: transparent;
      color: var(--color-text);
      font: inherit;
      font-size: 0.82rem;
      font-weight: 700;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    .sh-btn:hover:not(:disabled) { background: color-mix(in srgb, var(--sh-accent) 14%, transparent); }
    .sh-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .sh-btn:focus-visible { outline: 2px solid var(--sh-accent); outline-offset: 2px; }
    .sh-status { font-size: 0.78rem; color: var(--color-text-muted); }
    .sh-field {
      flex: 1 1 260px;
      min-width: 0;
      padding: 0.45rem 0.6rem;
      border: 1px solid var(--color-border-2);
      border-radius: var(--radius-sm);
      background: var(--color-bg);
      color: var(--color-text);
      font-family: var(--font-mono);
      font-size: 0.72rem;
    }
  `,
})
export class ShareButton {
  /** Route of the tool, e.g. "/cloud-security". */
  readonly route = input.required<string>();
  /** Current share code; null disables the button. */
  readonly code = input.required<string | null>();
  readonly accent = input('var(--color-accent)');
  readonly label = input('Copy share link');

  readonly status = signal('');
  readonly fallback = signal(false);
  readonly url = computed(() => (this.code() ? shareUrl(this.route(), this.code()!) : ''));

  async copy() {
    const url = this.url();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      this.fallback.set(false);
      this.status.set('Link copied');
    } catch {
      this.fallback.set(true);
      this.status.set('Copy the link below');
    }
  }
}
