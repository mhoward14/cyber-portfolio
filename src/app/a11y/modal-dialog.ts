/* ============================================================
   MODAL-DIALOG.TS — ACCESSIBLE DIALOG BEHAVIOUR
   Put on the window element of a popup:

     <div class="modal-window" appModalDialog="title-id" (dismissed)="close()">

   It gives the window dialog semantics (role="dialog", aria-modal,
   named by the element whose id you pass), moves keyboard focus into
   it when it opens, keeps Tab and Shift+Tab inside it, closes it on
   Escape, and returns focus to whatever opened it once it is gone.
   Screen readers then announce the dialog, and keyboard users are not
   left wandering through the page behind it.
   ============================================================ */

import { AfterViewInit, Directive, ElementRef, OnDestroy, inject, input, output } from '@angular/core';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function isShown(el: HTMLElement): boolean {
  if (el.closest('[hidden], [inert]')) return false;
  const style = getComputedStyle(el);
  return style.display !== 'none' && style.visibility !== 'hidden';
}

/** Tab stops inside `root`, in document order, skipping anything hidden. */
export function tabStops(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(isShown);
}

/** Where focus should go for a Tab press that would otherwise leave the dialog, or null to let it move normally. */
export function trapTarget(stops: HTMLElement[], current: Element | null, shift: boolean, dialog: HTMLElement): HTMLElement | null {
  if (!stops.length) return dialog;
  const first = stops[0];
  const last = stops[stops.length - 1];
  if (shift && (current === first || current === dialog)) return last;
  if (!shift && current === last) return first;
  return null;
}

@Directive({
  selector: '[appModalDialog]',
  standalone: true,
  host: {
    role: 'dialog',
    'aria-modal': 'true',
    tabindex: '-1',
    '[attr.aria-labelledby]': 'labelledBy() || null',
    '[attr.aria-label]': 'dialogLabel() || null',
    '(keydown)': 'onKeydown($event)',
    '(document:keydown.escape)': 'dismiss($event)',
  },
})
export class ModalDialog implements AfterViewInit, OnDestroy {
  /** id of the element that titles the dialog */
  readonly labelledBy = input('', { alias: 'appModalDialog' });
  /** Or a plain-text name, when there is no visible title */
  readonly dialogLabel = input('');
  readonly dismissed = output<void>();

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  /** The control that opened the dialog, captured before focus moves. */
  private readonly opener = typeof document === 'undefined' ? null : (document.activeElement as HTMLElement | null);

  ngAfterViewInit() {
    const target = this.el.querySelector<HTMLElement>('[data-autofocus], .close-btn') ?? this.el;
    target.focus();
  }

  ngOnDestroy() {
    if (this.opener && this.opener !== document.body && this.opener.isConnected) this.opener.focus();
  }

  dismiss(event: Event) {
    event.preventDefault();
    this.dismissed.emit();
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key !== 'Tab') return;
    const next = trapTarget(tabStops(this.el), document.activeElement, event.shiftKey, this.el);
    if (next) {
      event.preventDefault();
      next.focus();
    }
  }
}
