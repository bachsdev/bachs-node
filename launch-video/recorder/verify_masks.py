"""Prove no captured frame shows a secret: verify_masks.py <take dir>

masks.json lists, over time, the rectangles the in-page guard boxed over
secret text in the terminals. Every editor frame must show no glyphs inside
the boxes that were live when it was painted; any glyph pixels there would
mean a secret reached the recording.

Two timing allowances, each one-sided so a real leak still fails:
- New secret text: from 1.5 s before its boxes appear, frames are also
  checked at those positions, in case the text was painted before the guard
  saw it. This only adds checks.
- Moved boxes (the terminal scrolled): the compositor can paint the old
  layout for a frame after the page has moved on, so for 0.15 s a frame may
  pass against the previous layout instead. Either way every box in the
  layout it shows must be clean, so a secret exposed in either place fails.
"""
import json, sys
import numpy as np
from PIL import Image

T = sys.argv[1]
meta = json.load(open(f'{T}/editor/frames.json'))
masks = json.load(open(f'{T}/masks.json'))
wall0, slow = meta['wall0'], meta['slow']
ts = [(t - wall0) / slow for t in meta['frames']]  # paint times in playback seconds
LEAD, LATENCY = 1.5, 0.15

rects = [[tuple(r) for r in m['rects']] for m in masks]
grew = [len(rects[i]) > (len(rects[i - 1]) if i else 0) for i in range(len(masks))]


def glyphs(im, r):
    x, y, w, h = r
    px = im[round(y * 2) + 3:round((y + h) * 2) - 3, round(x * 2) + 3:round((x + w) * 2) - 3]
    if px.size == 0:
        return 0
    lum = px.mean(axis=2)
    chroma = px.max(axis=2) - px.min(axis=2)
    # Glyphs are neutral grey and much darker than the box. The terminal's
    # caret is saturated blue, and can sit in the box while a token is typed.
    return int(((lum < np.median(lum) - 60) & (chroma < 40)).sum())


checked = bad = 0
for i, t in enumerate(ts):
    nxt = ts[i + 1] if i + 1 < len(ts) else float('inf')
    k = max([j for j, m in enumerate(masks) if m['t'] <= t], default=-1)
    current = rects[k] if k >= 0 else []
    layouts = [current]
    if k >= 1 and not grew[k] and t - masks[k]['t'] < LATENCY:
        layouts.append(rects[k - 1])
    # Boxes for secret text about to appear: must be clean already.
    ahead = {r for j in range(k + 1, len(masks)) if grew[j] and masks[j]['t'] - LEAD <= nxt
             for r in rects[j] if r not in current}
    if not any(layouts) and not ahead:
        continue
    im = np.asarray(Image.open(f'{T}/editor/frames/{i:06d}.jpg').convert('RGB'), dtype=np.int16)
    counts = {r: glyphs(im, r) for layout in layouts for r in layout} | {r: glyphs(im, r) for r in ahead}
    checked += len(counts)
    clean_layout = any(all(counts[r] <= 6 for r in layout) for layout in layouts)
    leaks = [r for r in ahead if counts[r] > 6] + ([] if clean_layout else [r for r in layouts[0] if counts[r] > 6])
    if leaks:
        bad += 1
        for r in leaks:
            print(f'LEAK? frame {i} at {t:.2f}s, rect {r}: {counts[r]} glyph pixels')
print(f'{sum(len(r) for r in rects)} box placements, {checked} box checks, {bad} frames failed')
sys.exit(1 if bad else 0)
