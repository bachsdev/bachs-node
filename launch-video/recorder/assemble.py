"""Turn timestamped screencast frames into a constant-30fps video (each frame held until the next paint)."""
import json, subprocess, sys
B = sys.argv[1]
# Output size: optional W H arguments, default 4K.
W, H = (int(sys.argv[2]), int(sys.argv[3])) if len(sys.argv) > 3 else (3840, 2160)
meta = json.load(open(f'{B}/frames.json'))
ts = meta['frames']
start, end = meta['wall0'], meta['end']
# Map wall-clock paint times to playback time. Older takes use one 'slow' factor;
# newer ones list breakpoints where the factor changes.
breaks = meta.get('breaks') or [{'wall': start, 'play': 0, 'slow': meta.get('slow', 1)}]
def play(t):
    b = [x for x in breaks if x['wall'] <= t] or breaks[:1]
    b = b[-1]
    return b['play'] + (t - b['wall']) / b['slow']
lines = []
for i, t in enumerate(ts):
    nxt = ts[i + 1] if i + 1 < len(ts) else end
    if nxt <= start:
        continue  # painted before recording began; covered by the next frame
    a = max(t, start)
    lines.append(f"file '{B}/frames/{i:06d}.jpg'\nduration {max(0.001, play(nxt) - play(a)):.4f}")
lines.append(lines[-1].split('\n')[0])  # concat demuxer needs the last file repeated
open(f'{B}/frames.txt', 'w').write('\n'.join(lines) + '\n')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', f'{B}/frames.txt', '-vf', f'scale={W}:{H}:flags=lanczos,fps=30', '-c:v', 'libx264', '-preset', 'slow', '-crf', '10', '-pix_fmt', 'yuv444p', f'{B}/take.mkv'], check=True)
print(len(ts), 'paints ->', f'{B}/take.mkv')
