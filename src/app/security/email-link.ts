/* ============================================================
   EMAIL-LINK.TS — SCRAPER-RESISTANT MAILTO LINK
   The address is never written into the page or the bundle as one
   string: the link starts as a bare "mailto:" and the directive fills
   in the full address when a person reaches for it (pointer, touch,
   keyboard focus, or the click itself), so address harvesters that
   read the HTML or grep the JavaScript come away empty-handed.
   ============================================================ */

import { Directive, ElementRef, HostListener, inject } from '@angular/core';

/** Assembled at call time from parts, never stored whole. */
export function emailAddress(): string {
  return ['mhoward', '14'].join('') + String.fromCharCode(64) + ['icloud', 'com'].join('.');
}

@Directive({
  selector: 'a[appEmailLink]',
  standalone: true,
  host: { href: 'mailto:' },
})
export class EmailLink {
  private readonly el = inject<ElementRef<HTMLAnchorElement>>(ElementRef);

  @HostListener('pointerenter')
  @HostListener('touchstart')
  @HostListener('focus')
  @HostListener('click')
  reveal() {
    const href = `mailto:${emailAddress()}`;
    if (this.el.nativeElement.getAttribute('href') !== href) this.el.nativeElement.setAttribute('href', href);
  }
}
