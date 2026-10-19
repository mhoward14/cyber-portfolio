"""Turn the frames the recorder wrote into the README GIF or the site video.

    python3 tools/demo/assemble.py gif  <out-dir> <out.gif>  [width]
    python3 tools/demo/assemble.py webm <out-dir> <out.webm> [width]

<out-dir> is the folder record.mjs wrote (frames/ and frames.json). Both
outputs are built from the same frames, so they always match.

gif   Needs Pillow. One shared adaptive palette keeps colors steady
      between frames; the UI is flat color, so little is lost.
webm  Needs an ffmpeg that can read JPEG and write VP8 WebM. Set FFMPEG
      to its path, or have `ffmpeg` on PATH (Playwright's bundled
      ffmpeg-linux works). The frames are laid out at a constant 15 fps.
"""

import io
import json
import os
import pathlib
import shutil
import subprocess
import sys

from PIL import Image

FPS = 15


def load(out_dir, width):
    meta = json.loads((out_dir / "frames.json").read_text())
    images, durations = [], []
    for item in meta:
        im = Image.open(out_dir / "frames" / item["name"]).convert("RGB")
        height = round(im.height * width / im.width) // 2 * 2
        images.append(im.resize((width, height), Image.LANCZOS))
        durations.append(item["ms"])
    return images, durations


def make_gif(images, durations, target):
    sample = images[:: max(1, len(images) // 12)][:12]
    sheet = Image.new("RGB", (images[0].width, images[0].height * len(sample)))
    for i, im in enumerate(sample):
        sheet.paste(im, (0, i * im.height))
    palette = sheet.quantize(colors=128, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    frames = [im.quantize(palette=palette, dither=Image.Dither.NONE) for im in images]
    frames[0].save(target, save_all=True, append_images=frames[1:], duration=durations, loop=0, optimize=True, disposal=1)
    print(f"{len(frames)} frames, {sum(durations) / 1000:.1f} s, {target.stat().st_size / 1e6:.2f} MB")


def make_webm(images, durations, target):
    ffmpeg = os.environ.get("FFMPEG") or shutil.which("ffmpeg")
    if not ffmpeg:
        sys.exit("No ffmpeg found. Set FFMPEG to its path.")
    proc = subprocess.Popen(
        [ffmpeg, "-y", "-loglevel", "error", "-f", "image2pipe", "-vcodec", "mjpeg", "-framerate", str(FPS), "-i", "pipe:0",
         "-c:v", "libvpx", "-b:v", "0", "-crf", "34", "-pix_fmt", "yuv420p", "-an", str(target)],
        stdin=subprocess.PIPE,
    )
    total = 0
    for im, ms in zip(images, durations):
        buf = io.BytesIO()
        im.save(buf, "JPEG", quality=92)
        for _ in range(max(1, round(ms * FPS / 1000))):
            proc.stdin.write(buf.getvalue())
            total += 1
    proc.stdin.close()
    if proc.wait() != 0:
        sys.exit("ffmpeg failed")
    print(f"{total} frames at {FPS} fps, {total / FPS:.1f} s, {target.stat().st_size / 1e6:.2f} MB")


def main():
    kind, out_dir, target = sys.argv[1], pathlib.Path(sys.argv[2]), pathlib.Path(sys.argv[3])
    width = int(sys.argv[4]) if len(sys.argv) > 4 else (960 if kind == "gif" else 1280)
    images, durations = load(out_dir, width)
    {"gif": make_gif, "webm": make_webm}[kind](images, durations, target)


if __name__ == "__main__":
    main()
