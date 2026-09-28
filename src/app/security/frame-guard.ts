/* ============================================================
   FRAME-GUARD.TS — CLICKJACKING DEFENSE
   GitHub Pages can't send X-Frame-Options or a CSP frame-ancestors
   header, and browsers ignore frame-ancestors in a <meta> CSP. So the
   app checks for itself: when it is loaded inside another site's
   frame it does not start. It tries to take over the top window, and
   otherwise shows only a link to open the portfolio directly, leaving
   nothing interactive for a framing page to overlay.
   ============================================================ */

/** True when this window is inside a frame. A cross-origin parent
 *  throws on access, which also means framed. */
export function isFramed(win: Window = window): boolean {
  try {
    return win.self !== win.top;
  } catch {
    return true;
  }
}

/** Replace the page with a notice and try to break out of the frame. */
export function refuseFraming(doc: Document = document) {
  const win = doc.defaultView;
  try {
    if (win?.top) win.top.location.href = win.location.href;
  } catch {
    /* blocked by the browser or a sandbox: fall back to the notice */
  }
  const notice = doc.createElement('p');
  notice.textContent = 'This portfolio can’t be shown inside another site. ';
  const link = doc.createElement('a');
  link.href = win?.location.href ?? 'https://mhoward14.github.io/cyber-portfolio/';
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = 'Open it directly';
  notice.append(link);
  doc.body.replaceChildren(notice);
}
