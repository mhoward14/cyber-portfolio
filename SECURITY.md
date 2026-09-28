# Security

This portfolio is a static, client-side Angular application served by GitHub Pages. It has no server, no accounts, no cookies and no back end: everything a visitor does stays in their own browser. The controls below target the attacks that still apply to a site like this: cross-site scripting, clickjacking, malicious links, data injection into downloads and supply-chain compromise.

## Browser-side controls

| Threat | Control |
| --- | --- |
| Cross-site scripting | Angular's template escaping and URL sanitization everywhere. No `innerHTML`, `bypassSecurityTrust*`, `eval` or dynamic HTML in the codebase. **Trusted Types** is enforced (`require-trusted-types-for 'script'`), so the browser rejects any plain string written into an HTML or script sink. Only Angular's own sanitizing policies may create those values. |
| Script injection | A Content Security Policy that allows scripts only from this site and Cloudflare Web Analytics. It allows no inline script, no inline event handlers, no plugins (`object-src 'none'`) and no embedded frames (`frame-src 'none'`), and it locks down `base-uri`, `form-action` and `worker-src`. Certification badges are local images that link out to Credly for verification; no third-party widget code runs on the page. |
| Clickjacking | The app refuses to start inside another site's frame and tries to break out of it (see [`frame-guard.ts`](src/app/security/frame-guard.ts)). This is needed because GitHub Pages can't send `X-Frame-Options` or a `frame-ancestors` header. |
| Reverse tabnabbing | Every link that opens a new tab carries `rel="noopener"`. |
| Malicious shared links | Share codes (`?s=`) are length-capped, versioned and strictly decoded. Anything unrecognized is ignored, and a shared result is never saved over the visitor's own work unless they choose to keep it. |
| Tampered local storage | Saved state for every tool (RMF, Zero Trust, Cloud, CI/CD, Transaction) and Engagement Mode data is validated on load against known keys and allowed values. Anything unknown or malformed is dropped. |
| Spreadsheet formula injection | CSV cells beginning with `=` `+` `-` `@`, a tab or a carriage return are prefixed so Excel shows them as text instead of evaluating them. |
| Hostile packet captures | The Packet Analysis Lab parses uploaded `.pcap`/`.pcapng` files locally with bounds-checked readers and a frame cap. Files are never uploaded. |
| Referrer leakage | `strict-origin-when-cross-origin`: other sites see only the origin, never the page or share code. |
| Email harvesting | The contact address is assembled only when a visitor reaches for the link, so it isn't in the page source or the JavaScript bundle. |
| Supply chain | Production dependencies are kept at zero known vulnerabilities (`npm audit`). GitHub Actions are pinned to full commit SHAs, and each workflow job has least-privilege permissions. |

## Platform limits

GitHub Pages can't set custom HTTP response headers, and some protections only work as headers:

- **`frame-ancestors`, `X-Frame-Options`**: browsers ignore these in a `<meta>` policy. They are replaced by the frame guard above.
- **`Strict-Transport-Security`**: GitHub Pages enforces HTTPS, and `github.io` is on the browsers' HSTS preload list, so this is already covered.
- **`X-Content-Type-Options`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`**: not available on this platform. The site uses no powerful browser features and holds no cross-origin secrets, which limits the impact.
- **Subresource Integrity**: not possible for the one remaining third-party script, Cloudflare Web Analytics, because it's served from a versionless URL that changes without notice. The CSP limits it to its own host, and Trusted Types limits what it could do to the page.

A custom domain behind a proxy that can add headers (for example, Cloudflare) would allow all of the above to be set as real response headers.

## Reporting a vulnerability

Please report security issues privately through GitHub: open this repository's **Security** tab and choose **Report a vulnerability**. Please don't open a public issue.
