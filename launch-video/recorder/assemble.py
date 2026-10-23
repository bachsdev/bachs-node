"""Turn timestamped screencast frames into a constant-30fps video (each frame held until the next paint)."""
import json, subprocess, sys
B = sys.argv[1]
meta = json.load(open(f'{B}/frames.json'))
ts = meta['frames']
start, end = meta['wall0'], meta['end']
slow = meta.get('slow', 1)
lines = []
for i, t in enumerate(ts):
    nxt = ts[i + 1] if i + 1 < len(ts) else end
    if nxt <= start:
        continue  # painted before recording began; covered by the next frame
    a = max(t, start)
    lines.append(f"file '{B}/frames/{i:06d}.jpg'\nduration {max(0.001, (nxt - a) / slow):.4f}")
lines.append(lines[-1].split('\n')[0])  # concat demuxer needs the last file repeated
open(f'{B}/frames.txt', 'w').write('\n'.join(lines) + '\n')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', f'{B}/frames.txt', '-vf', 'scale=3840:2160:flags=lanczos,fps=30', '-c:v', 'libx264', '-preset', 'slow', '-crf', '10', '-pix_fmt', 'yuv444p', f'{B}/take.mkv'], check=True)
print(len(ts), 'paints ->', f'{B}/take.mkv')
