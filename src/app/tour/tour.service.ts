import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TOUR_STEPS } from './tour-steps';

/** Guided-tour state. The tour only navigates and highlights; it never
 *  changes anything a visitor has saved. */
@Injectable({ providedIn: 'root' })
export class TourService {
  private readonly router = inject(Router, { optional: true });
  readonly steps = TOUR_STEPS;
  readonly index = signal<number | null>(null);
  readonly active = computed(() => this.index() !== null);
  readonly step = computed(() => {
    const i = this.index();
    return i === null ? null : this.steps[i];
  });
  readonly isLast = computed(() => this.index() === this.steps.length - 1);

  /** Element focused when the tour started, to return focus to at the end. */
  private returnFocus: HTMLElement | null = null;

  start() {
    if (typeof document !== 'undefined') this.returnFocus = document.activeElement as HTMLElement | null;
    this.go(0);
  }

  next() {
    const i = this.index();
    if (i === null) return;
    if (i >= this.steps.length - 1) this.end();
    else this.go(i + 1);
  }

  back() {
    const i = this.index();
    if (i !== null && i > 0) this.go(i - 1);
  }

  end() {
    this.index.set(null);
    const el = this.returnFocus;
    this.returnFocus = null;
    if (el && typeof el.focus === 'function' && el.isConnected) el.focus();
  }

  private go(i: number) {
    const route = this.steps[i].route;
    this.index.set(i);
    if (this.router && this.router.url.split('?')[0].split('#')[0] !== route) this.router.navigateByUrl(route);
  }
}
