/* ============================================================
   ROUTE-FOCUS.TS — TELL ASSISTIVE TECHNOLOGY THE PAGE CHANGED
   A single-page app never reloads, so a screen reader hears nothing
   when a visitor follows a link, and keyboard focus stays on the old
   link. After each real page change the app moves focus to the new
   page's main heading, which the screen reader then reads aloud, and
   keyboard users continue from the top of the new content.

   Changes that only touch the query string (a share code, a filter)
   are not page changes and leave focus alone.
   ============================================================ */

/** The route without its query string or fragment: "/attack-path?s=x" → "/attack-path". */
export function pagePath(url: string): string {
  return url.split(/[?#]/)[0];
}

/** Focus the page's <h1>, retrying for a few frames while a lazy route renders.
 *  Returns true when the heading was found on this attempt. */
export function focusPageHeading(doc: Document = document, framesLeft = 12): boolean {
  const heading = doc.querySelector<HTMLElement>('main h1');
  if (heading) {
    if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: true });
    return true;
  }
  const win = doc.defaultView;
  if (framesLeft > 0 && win) win.requestAnimationFrame(() => focusPageHeading(doc, framesLeft - 1));
  return false;
}
