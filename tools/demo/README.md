# Engagement Mode demo

Scripts that regenerate the demo shown in the README (a GIF) and on the home page (a WebM video). Everything in it is fictional. They are maintainer tools: nothing here runs in CI or the site build.

## Regenerate

```bash
npm run build                       # the recorder drives the production build
node tools/demo/record.mjs dist/portfolio-ui/browser /tmp/demo
python3 tools/demo/assemble.py gif  /tmp/demo docs/engagement-mode.gif
python3 tools/demo/assemble.py webm /tmp/demo public/media/engagement-mode.webm
cp /tmp/demo/poster.png public/media/engagement-mode-poster.png
```

- `record.mjs` uses the `playwright-core` already in the dev dependencies. It needs Google Chrome, or set `A11Y_BROWSER` to a Chromium executable. It captures frames while a script clicks through the five shots, with a caption bar and a ring around each thing it clicks.
- `assemble.py gif` needs [Pillow](https://pypi.org/project/pillow/). `assemble.py webm` needs an `ffmpeg` that can read JPEG and write VP8 WebM: put it on `PATH` or set `FFMPEG` to its path.
- Both files come from the same frames, so they always match. Expect about 40 seconds, a 5 MB GIF and a 1 MB video.

## When to regenerate

After a redesign of a tool the demo visits (Attack Path Builder, Cloud Security, RMF Tracker, Engagement Report, SSP Generator). If the script's selectors stop matching, it fails loudly rather than recording the wrong thing. A unit test keeps the files inside a size budget.

Update the text description under the video on the home page if the shots change.
