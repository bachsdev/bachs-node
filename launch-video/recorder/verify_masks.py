"""Prove no captured frame shows a secret: verify_masks.py <take dir>

masks.json lists, over time, the rectangles of secret text in the terminals.
Every editor frame painted while a rectangle is live (from 1.5 s before it
first appears) must show no glyphs inside it, only the in-page guard's box.
Any glyph pixels there would mean a secret reached the recording.
"""
import json, sys
import numpy as np
from PIL import Image

T = sys.argv[1]
meta = json.load(open(f'{T}/editor/frames.json'))
masks = json.load(open(f'{T}/masks.json'))
wall0, slow = meta['wall0'], meta['slow']
ts = [(t - wall0) / slow for t in meta['frames']]  # paint times in playback seconds

# Each distinct rectangle, with when it was first and last live.
spans = {}
for i, m in enumerate(masks):
    until = masks[i + 1]['t'] if i + 1 < len(masks) else float('inf')
    for r in m['rects']:
        a, b = spans.get(tuple(r), (m['t'], until))
        spans[tuple(r)] = (min(a, m['t']), max(b, until))

checked = bad = 0
for i, t in enumerate(ts):
    nxt = ts[i + 1] if i + 1 < len(ts) else float('inf')
    live = [r for r, (a, b) in spans.items() if nxt >= a - 1.5 and t <= b]
    if not live:
        continue
    im = np.asarray(Image.open(f'{T}/editor/frames/{i:06d}.jpg').convert('RGB'), dtype=np.int16)
    for x, y, w, h in live:
        px = im[round(y * 2) + 3:round((y + h) * 2) - 3, round(x * 2) + 3:round((x + w) * 2) - 3]
        if px.size == 0:
            continue
        lum = px.mean(axis=2)
        chroma = px.max(axis=2) - px.min(axis=2)
        # Glyphs are neutral grey and much darker than the box. The terminal's
        # caret is saturated blue, and can sit in the box while a token is typed.
        glyph = ((lum < np.median(lum) - 60) & (chroma < 40)).sum()
        checked += 1
        if glyph > 6:
            bad += 1
            print(f'LEAK? frame {i} at {t:.2f}s, rect {x},{y},{w},{h}: {glyph} glyph pixels')
print(f'{len(spans)} secret rects, {checked} rect checks, {bad} failures')
sys.exit(1 if bad else 0)
