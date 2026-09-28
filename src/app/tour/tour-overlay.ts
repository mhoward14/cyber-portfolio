/* ============================================================
   TOUR-OVERLAY.TS — GUIDED TOUR
   Dims the page, cuts a spotlight around the current step's element,
   and shows a step card beside it (centered when the step has no
   target; a bottom sheet on narrow screens). The page behind is
   inert while the tour runs: clicks are absorbed, focus stays in the
   card, arrow keys move between steps, and Esc ends the tour.
   ============================================================ */

import { Component, ElementRef, OnDestroy, computed, effect, inject, signal, viewChild } from '@angular/core';
import { TourService } from './tour.service';

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PAD = 8;
const CARD_W = 360;
const GAP = 14;

/** Where the card goes relative to the spotlight, clamped to the viewport. */
export function placeCard(target: Rect | null, viewport: { width: number; height: number }, cardHeight: number) {
  if (viewport.width < 640) return { mode: 'sheet' as const, top: 0, left: 0 };
  const width = Math.min(CARD_W, viewport.width - 32);
  if (!target) {
    return { mode: 'center' as const, top: Math.max(16, (viewport.height - cardHeight) / 2), left: (viewport.width - width) / 2 };
  }
  // Tall targets: beside them when there is room, so the card never covers them.
  if (target.height > viewport.height * 0.45) {
    const top = Math.min(Math.max(16, target.top), viewport.height - cardHeight - 16);
    if (target.left - PAD - GAP - width >= 16) return { mode: 'left' as const, top, left: target.left - PAD - GAP - width };
    if (target.left + target.width + PAD + GAP + width <= viewport.width - 16) {
      return { mode: 'right' as const, top, left: target.left + target.width + PAD + GAP };
    }
  }
  const left = Math.min(Math.max(16, target.left), viewport.width - width - 16);
  const below = target.top + target.height + PAD + GAP;
  if (below + cardHeight <= viewport.height - 16) return { mode: 'below' as const, top: below, left };
  const above = target.top - PAD - GAP - cardHeight;
  if (above >= 16) return { mode: 'above' as const, top: above, left };
  // Tall target: overlay the card inside the bottom of the viewport.
  return { mode: 'inside' as const, top: viewport.height - cardHeight - 16, left };
}

@Component({
  selector: 'app-tour-overlay',
  standalone: true,
  template: `
    @if (tour.step(); as step) {
      <div class="tour-layer" (click)="$event.stopPropagation()">
        @if (spot(); as r) {
          <div class="tour-spot" [style.--tour-accent]="step.accent"
            [style.top.px]="r.top - pad" [style.left.px]="r.left - pad"
            [style.width.px]="r.width + pad * 2" [style.height.px]="r.height + pad * 2"></div>
        } @else {
          <div class="tour-dim"></div>
        }
        <div #card class="tour-card" [class]="'tour-card is-' + placement().mode" [style.--tour-accent]="step.accent"
          [style.top.px]="placement().mode === 'sheet' ? null : placement().top"
          [style.left.px]="placement().mode === 'sheet' ? null : placement().left"
          role="dialog" aria-modal="true" aria-labelledby="tour-title" aria-describedby="tour-body"
          (keydown)="onKey($event)">
          <div class="tour-meta">
            <span class="tour-count">{{ (tour.index() ?? 0) + 1 }} / {{ tour.steps.length }}</span>
            <button type="button" class="tour-skip" (click)="tour.end()">{{ tour.isLast() ? 'Close' : 'Skip tour' }}</button>
          </div>
          <h2 id="tour-title" class="tour-title">{{ step.title }}</h2>
          <p id="tour-body" class="tour-body">{{ step.body }}</p>
          <div class="tour-dots" aria-hidden="true">
            @for (s of tour.steps; track $index) {
              <span [class.is-on]="$index === tour.index()"></span>
            }
          </div>
          <div class="tour-actions">
            <button type="button" class="tour-btn" (click)="tour.back()" [disabled]="tour.index() === 0">Back</button>
            <button #next type="button" class="tour-btn tour-primary" (click)="tour.next()">{{ tour.isLast() ? 'Finish' : 'Next' }}</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .tour-layer { position: fixed; inset: 0; z-index: 10000; }
    .tour-dim { position: fixed; inset: 0; background: rgba(3, 7, 18, 0.72); }
    .tour-spot {
      --tour-accent: var(--color-accent);
      position: fixed;
      border-radius: var(--radius-lg);
      box-shadow: 0 0 0 9999px rgba(3, 7, 18, 0.72), 0 0 0 2px var(--tour-accent), 0 0 24px 4px color-mix(in srgb, var(--tour-accent) 45%, transparent);
      pointer-events: none;
      transition: top 0.25s ease, left 0.25s ease, width 0.25s ease, height 0.25s ease;
    }
    .tour-card {
      --tour-accent: var(--color-accent);
      position: fixed;
      width: min(360px, calc(100vw - 32px));
      padding: 1.1rem 1.2rem 1rem;
      border: 1px solid color-mix(in srgb, var(--tour-accent) 55%, var(--color-border));
      border-top: 3px solid var(--tour-accent);
      border-radius: var(--radius-lg);
      background: var(--color-surface);
      color: var(--color-text);
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
    }
    .tour-card.is-sheet { left: 12px; right: 12px; bottom: 12px; width: auto; }
    .tour-meta { display: flex; justify-content: space-between; align-items: center; }
    .tour-count { font-family: var(--font-mono); font-size: 0.7rem; font-weight: 700; letter-spacing: 0.08em; color: var(--color-text-muted); }
    .tour-skip { border: 0; background: none; padding: 0.2rem 0; color: var(--color-text-muted); font: inherit; font-size: 0.78rem; text-decoration: underline; cursor: pointer; }
    .tour-skip:hover { color: var(--color-text); }
    .tour-title { margin: 0.45rem 0 0.35rem; font-size: 1.05rem; font-weight: 800; line-height: 1.3; }
    .tour-body { margin: 0 0 0.85rem; font-size: 0.88rem; line-height: 1.55; color: var(--color-text-muted); }
    .tour-dots { display: flex; gap: 0.3rem; margin-bottom: 0.85rem; }
    .tour-dots span { width: 6px; height: 6px; border-radius: 50%; background: var(--color-border-2); }
    .tour-dots span.is-on { width: 16px; border-radius: 3px; background: var(--tour-accent); }
    .tour-actions { display: flex; justify-content: flex-end; gap: 0.5rem; }
    .tour-btn {
      padding: 0.5rem 1rem;
      border: 1px solid var(--color-border-2);
      border-radius: var(--radius-md);
      background: transparent;
      color: var(--color-text);
      font: inherit;
      font-size: 0.85rem;
      font-weight: 700;
      cursor: pointer;
    }
    .tour-btn:disabled { opacity: 0.4; cursor: default; }
    .tour-primary { border-color: var(--tour-accent); background: color-mix(in srgb, var(--tour-accent) 22%, transparent); }
    .tour-primary:hover { background: color-mix(in srgb, var(--tour-accent) 34%, transparent); }
    .tour-card button:focus-visible { outline: 2px solid var(--tour-accent); outline-offset: 2px; }
  `,
})
export class TourOverlay implements OnDestroy {
  readonly tour = inject(TourService);
  private readonly host = inject(ElementRef<HTMLElement>);
  readonly pad = PAD;

  private readonly card = viewChild<ElementRef<HTMLElement>>('card');
  private readonly nextBtn = viewChild<ElementRef<HTMLButtonElement>>('next');

  readonly spot = signal<Rect | null>(null);
  private readonly viewport = signal({ width: 1024, height: 768 });
  private readonly cardHeight = signal(220);
  readonly placement = computed(() => placeCard(this.spot(), this.viewport(), this.cardHeight()));

  private targets: Element[] = [];
  private search = 0;
  private readonly onViewportChange = () => this.measure();
  private readonly onDocKey = (e: KeyboardEvent) => {
    if (!this.tour.active()) return;
    // Keys pressed outside the card (e.g. before focus lands) still work.
    if (!this.card()?.nativeElement.contains(e.target as Node)) this.onKey(e);
  };

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this.onViewportChange);
      window.addEventListener('scroll', this.onViewportChange, true);
      document.addEventListener('keydown', this.onDocKey);
    }
    effect(() => {
      const step = this.tour.step();
      if (typeof window === 'undefined') return;
      cancelAnimationFrame(this.search);
      this.targets = [];
      this.spot.set(null);
      if (!step) return;
      this.findTarget(step.targets, 0);
    });
  }

  ngOnDestroy() {
    if (typeof window === 'undefined') return;
    window.removeEventListener('resize', this.onViewportChange);
    window.removeEventListener('scroll', this.onViewportChange, true);
    document.removeEventListener('keydown', this.onDocKey);
    cancelAnimationFrame(this.search);
  }

  /** The route may still be loading: look for the target for up to ~1.5s. */
  private findTarget(selectors: string[], attempt: number) {
    const found = selectors
      .map((s) => Array.from(document.querySelectorAll(s)).filter((e) => !this.host.nativeElement.contains(e)))
      .find((list) => list.length);
    if (found || !selectors.length || attempt > 90) {
      this.targets = found ?? [];
      const box = this.bounds();
      if (found && box) window.scrollBy({ top: box.top + box.height / 2 - window.innerHeight / 2, behavior: 'instant' as ScrollBehavior });
      this.measure();
      this.focusCard();
      return;
    }
    this.search = requestAnimationFrame(() => this.findTarget(selectors, attempt + 1));
  }

  private measure() {
    this.viewport.set({ width: window.innerWidth, height: window.innerHeight });
    const card = this.card()?.nativeElement;
    if (card) this.cardHeight.set(card.offsetHeight);
    const r = this.bounds();
    if (!r) {
      this.spot.set(null);
      return;
    }
    // Keep the spotlight on screen for elements taller than the viewport.
    const top = Math.max(r.top, 8);
    const bottom = Math.min(r.top + r.height, window.innerHeight - 8);
    this.spot.set({ top, left: r.left, width: r.width, height: Math.max(0, bottom - top) });
  }

  /** Viewport box around every current target. */
  private bounds(): Rect | null {
    if (!this.targets.length) return null;
    const rects = this.targets.map((t) => t.getBoundingClientRect());
    const top = Math.min(...rects.map((r) => r.top));
    const left = Math.min(...rects.map((r) => r.left));
    const bottom = Math.max(...rects.map((r) => r.bottom));
    const right = Math.max(...rects.map((r) => r.right));
    return { top, left, width: right - left, height: bottom - top };
  }

  private focusCard() {
    requestAnimationFrame(() => {
      this.measure();
      this.nextBtn()?.nativeElement.focus({ preventScroll: true });
    });
  }

  onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      this.tour.end();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      this.tour.next();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      this.tour.back();
    } else if (e.key === 'Tab') {
      // Keep focus inside the card while the page behind is inert.
      const buttons = Array.from(this.card()?.nativeElement.querySelectorAll('button:not(:disabled)') ?? []) as HTMLElement[];
      if (!buttons.length) return;
      const i = buttons.indexOf(document.activeElement as HTMLElement);
      const next = e.shiftKey ? (i <= 0 ? buttons.length - 1 : i - 1) : (i + 1) % buttons.length;
      e.preventDefault();
      buttons[next].focus();
    }
  }
}
