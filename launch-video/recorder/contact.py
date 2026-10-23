"""Contact sheet of a take: contact.py <take dir> <out.jpg> [window] [width]
One frame per event (the last paint at or before it), labelled, for eyeballing."""
import json, sys
from PIL import Image, ImageDraw, ImageFont
T, out = sys.argv[1], sys.argv[2]
win = sys.argv[3] if len(sys.argv) > 3 else 'editor'
W = int(sys.argv[4]) if len(sys.argv) > 4 else 960
meta = json.load(open(f'{T}/{win}/frames.json'))
ts = [(t - meta['wall0']) / meta['slow'] for t in meta['frames']]
evs = [e for e in json.load(open(f'{T}/events.json')) if e['name'] not in ('line', 'mouse')]
H = W * 9 // 16
cols = 2
rows = (len(evs) + cols - 1) // cols
sheet = Image.new('RGB', (cols * W, rows * (H + 30)), 'white')
d = ImageDraw.Draw(sheet)
for k, e in enumerate(evs):
    i = max([j for j, t in enumerate(ts) if t <= e['t'] + 0.05] or [0])
    im = Image.open(f'{T}/{win}/frames/{i:06d}.jpg').resize((W, H), Image.LANCZOS)
    x, y = (k % cols) * W, (k // cols) * (H + 30)
    sheet.paste(im, (x, y + 30))
    d.text((x + 8, y + 8), f"{e['name']} @ {e['t']:.2f}s (frame {i})", fill='black')
sheet.save(out, quality=88)
print(out)
