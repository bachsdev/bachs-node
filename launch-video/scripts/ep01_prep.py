"""Prepare episode 01 takes for the edit: ep01_prep.py <recdir> <node|python> [chapter ...]

For each take in <recdir>/takes/<chapter>:
- rebuilds each window's 30 fps 4K video from its paint timestamps
  (recorder/assemble.py) into public/tutorial/ep01-<lang>-<chapter>-<window>.mp4
  (gitignored: the takes are large and are re-made from the recorder);
- writes src/tutorial/ep01/<lang>/<chapter>.json with the events, the secret
  mask rectangles and the take's length, which the edit times everything from.
"""
import json, os, subprocess, sys

REC, LANG = sys.argv[1], sys.argv[2]
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
chapters = sys.argv[3:] or sorted(os.listdir(f'{REC}/takes'))
out_json = f'{ROOT}/src/tutorial/ep01/{LANG}'
os.makedirs(out_json, exist_ok=True)
os.makedirs(f'{ROOT}/public/tutorial', exist_ok=True)

for c in chapters:
    T = f'{REC}/takes/{c}'
    if not os.path.exists(f'{T}/events.json'):
        print('skip', c, '(no finished take)')
        continue
    events = json.load(open(f'{T}/events.json'))
    windows = [w for w in ('editor', 'browser') if os.path.exists(f'{T}/{w}/frames.json')]
    for w in windows:
        subprocess.run(['python3', f'{ROOT}/recorder/assemble.py', f'{T}/{w}'], check=True, capture_output=True)
        dst = f'{ROOT}/public/tutorial/ep01-{LANG}-{c}-{w}.mp4'
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', f'{T}/{w}/take.mkv', '-c', 'copy', '-movflags', '+faststart', dst], check=True)
    masks = json.load(open(f'{T}/masks.json')) if os.path.exists(f'{T}/masks.json') else []
    json.dump({'chapter': c, 'duration': events[-1]['t'], 'windows': windows, 'events': events, 'masks': masks},
              open(f'{out_json}/{c}.json', 'w'), indent=1)
    print(c, windows, f"{events[-1]['t']:.1f}s")
