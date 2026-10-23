"""Independent secret check by OCR: verify_ocr.py <take dir> <session.env> [every]

Reads the secret values from session.env (never prints them), OCRs the
terminal area of every Nth raw 4K editor frame plus the last, and fails if any
6-character piece of a secret is legible anywhere in it. verify_masks.py proves
the guard's boxes are opaque; this catches text the guard never boxed.
"""
import json, os, re, subprocess, sys, tempfile
from PIL import Image
from concurrent.futures import ThreadPoolExecutor

T, env = sys.argv[1], sys.argv[2]
every = int(sys.argv[3]) if len(sys.argv) > 3 else 6
secrets = [re.sub(r'^(sk_sandbox_|sk_live_|whsec_)', '', v) for v in
           re.findall(r"""(?:BACHS_API_KEY|BACHS_WEBHOOK_SECRET)=['"]?([A-Za-z0-9_]+)""", open(env).read())]
secrets += [s for s in os.environ.get('EXTRA_SECRETS', '').split(',') if s]
# OCR mixes up look-alike glyphs (0/O/@, 1/l/I, 9/q...), so compare folded text.
GROUPS = {'o': '0o@q9', '1': '1lij|!', 's': '5s$', '8': '8b', 'z': '2z', 'g': '6g'}
FOLD = str.maketrans(''.join(GROUPS.values()), ''.join(k * len(v) for k, v in GROUPS.items()))
fold = lambda t: t.lower().translate(FOLD)
grams = {fold(s[i:i + 6]) for s in secrets for i in range(len(s) - 5)}
if not grams:
    sys.exit('no secrets found to check for')

n = len(json.load(open(f'{T}/editor/frames.json'))['frames'])
picks = sorted(set(range(0, n, every)) | {n - 1})

def ocr(i):
    # Only the terminal panel can show a secret: the bottom 36% of the window.
    # Cropping it keeps tesseract fast; it runs single-threaded, four at a time.
    im = Image.open(f'{T}/editor/frames/{i:06d}.jpg')
    w, h = im.size
    with tempfile.NamedTemporaryFile(suffix='.png') as f:
        im.crop((0, int(h * 0.64), w, h)).convert('L').save(f.name)
        out = subprocess.run(['tesseract', f.name, '-', '--psm', '6'], capture_output=True, text=True,
                             env={**os.environ, 'OMP_THREAD_LIMIT': '1'}).stdout
    text = fold(re.sub(r'\s+', '', out))
    return i, sum(g in text for g in grams), len(text)

hits = 0
with ThreadPoolExecutor(4) as ex:
    for i, k, chars in ex.map(ocr, picks):
        if k:
            hits += 1
            print(f'LEAK: frame {i} shows {k} secret fragment(s)')
print(f'OCR checked {len(picks)} of {n} frames, {hits} with secret fragments')
sys.exit(1 if hits else 0)
