# Accessibility

The portfolio aims to meet **WCAG 2.2 Level AA**, and every page and interactive tool is built to work with a keyboard, a screen reader, browser zoom, and the operating system's reduced-motion and color-scheme settings.

## What's built in

- **Skip link.** The first Tab stop on every page is "Skip to main content".
- **Landmarks and headings.** Every page has one `<h1>`, an unbroken heading outline, and distinct, labelled `banner`, `navigation`, `main` and `complementary` regions.
- **A title for every page.** The tab title, browser history and screen readers name the tool you're on, for example "Attack Path Builder | Matthew Howard".
- **Focus follows navigation.** The site is a single-page app, so after each page change focus moves to the new page's heading. A screen reader announces it, and keyboard users continue from the top of the new content. It does not do this on the first load, or while the guided tour is running.
- **Real dialogs.** Detail windows and the guided tour announce as dialogs, take focus when they open, keep Tab inside them, close on Escape, and return focus to the control that opened them.
- **Visible keyboard focus.** Every control shows a focus ring that meets 3:1 contrast, including the fields that use custom borders.
- **Color contrast.** Text and controls meet 4.5:1 (3:1 for large text and graphics) in both the dark and light themes.
- **Labelled controls.** Every form field, including the search box and each RMF notes field, has an accessible name. Icon-only buttons are labelled.
- **Announced changes.** Search results counts, filter errors and share-link notices are exposed as live regions.
- **Target size.** Interactive targets meet the WCAG 2.5.8 minimum: 24 × 24 CSS pixels, or enough spacing around smaller ones.
- **Motion.** Animation is disabled under `prefers-reduced-motion`.
- **Zoom and reflow.** The layout reflows down to 320 px wide, with no horizontal scrolling.

## How it's tested

- **Automated.** [axe-core](https://github.com/dequelabs/axe-core) runs against all 11 pages in the dark and light themes at desktop and phone widths, using the WCAG 2.0, 2.1, 2.2 A and AA rules plus axe's best-practice rules. It also runs against the interactive states: open dialogs, the guided tour, expanded case studies, a started Packet Lab hunt with a selected packet and an invalid filter, an incident-response scenario, an expanded RMF control, and a shared-link notice.
- **Manual keyboard checks.** Tab order, the skip link, focus visibility, focus after navigation, dialog focus trapping and Escape, and Packet Lab arrow-key navigation.
- **Unit tests** cover the dialog behavior and the focus-after-navigation logic.

## Known limits

- This is a self-assessment, not a formal audit by a third party.
- Automated tools find only part of the accessibility problems that exist, and the manual checks above were done with a keyboard and a browser, not with a screen reader. Screen-reader testing (VoiceOver, NVDA, JAWS) has not been done.
- The Packet Analysis Lab's packet list is a data grid built for keyboard and mouse use. Its behavior with screen readers hasn't been verified.

## Reporting a problem

If something doesn't work for you, please [open an issue](https://github.com/mhoward14/cyber-portfolio/issues) with the page, what you were trying to do, and the browser and assistive technology you used.
