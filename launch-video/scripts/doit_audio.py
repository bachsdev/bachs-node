"""Sound for "Do it with Bachs" and "Build it with Bachs": Mixkit "Let's Move"
(Michael Ramir C.) cut to the picture at bar lines, plus a soft tick under the opening
words and a mouse click on every real click in the SnapKit clips.

    python3 scripts/doit_audio.py            # src/doit/edit.json -> public/audio/doit-mix.wav
    python3 scripts/doit_audio.py buildwith  # src/buildwith/edit.json -> public/audio/buildwith-mix.wav
    python3 scripts/doit_audio.py mcplaunch  # src/mcplaunch/edit.json -> public/audio/mcplaunch-mix.wav

The Mixkit files are downloaded into public/audio/mixkit/, which is not committed:
Mixkit's licences allow using them in a video but not sharing the raw files.
"""

import json
import pathlib
import subprocess
import sys
import urllib.request
import wave

import numpy as np

ROOT = pathlib.Path(__file__).resolve().parent.parent
SR = 48000
NAME = sys.argv[1] if len(sys.argv) > 1 else "doit"
edit = json.loads((ROOT / f"src/{NAME}/edit.json").read_text())
FPS = edit["fps"]
total = edit["total"] / FPS
LIB = ROOT / "public/audio/mixkit"


def fetch(kind, id):
    path = LIB / f"{kind}-{id}.{'mp3' if kind == 'music' else 'wav'}"
    if not path.exists():
        url = (f"https://assets.mixkit.co/music/{id}/{id}.mp3" if kind == "music"
               else f"https://assets.mixkit.co/active_storage/sfx/{id}/{id}.wav")
        LIB.mkdir(parents=True, exist_ok=True)
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        path.write_bytes(urllib.request.urlopen(req, timeout=60).read())
    return path


def decode(path, af=None):
    cmd = ["ffmpeg", "-v", "error", "-i", str(path)] + (["-af", af] if af else []) + ["-ac", "2", "-ar", str(SR), "-f", "f32le", "-"]
    return np.frombuffer(subprocess.run(cmd, capture_output=True, check=True).stdout, "<f4").reshape(-1, 2).astype(float)


# Music: 22 s from the track's bar at 10.03 s (quiet intro, riser, the drop at 16.03 s),
# then a splice on a bar line to 94.03 s so the song's own final hit lands on the logo.
m = edit["music"]
track = decode(fetch("music", m["id"]))
a = track[int(m["trackStart"] * SR):int((m["trackStart"] + m["spliceAt"]) * SR)]
b = track[int(m["spliceTo"] * SR):]
x = int(0.012 * SR)  # short equal-power crossfade, centred on the bar line
k = np.linspace(0, 1, 2 * x)[:, None]
music = np.concatenate([a[:-x], a[-x:] * np.cos(k[:x] * np.pi / 2) + b[:x] * np.sin(k[:x] * np.pi / 2), b[x:]])
n = int(total * SR)
music = np.pad(music, ((0, max(0, n - len(music))), (0, 0)))[:n]
fade = int(0.45 * SR)
music[-fade:] *= np.linspace(1, 0, fade)[:, None] ** 2

# Bring the bed to -14 LUFS (linear gain, measured with ffmpeg's EBU R128 meter).
def lufs(sig):
    tmp = ROOT / "out/.mix-measure.wav"
    tmp.parent.mkdir(exist_ok=True)
    write(tmp, sig)
    log = subprocess.run(["ffmpeg", "-v", "info", "-nostats", "-i", str(tmp), "-af", "ebur128=peak=true", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    tmp.unlink()
    summary = log[log.rfind("Summary:"):]
    i = float(summary.split("I:")[1].split("LUFS")[0])
    tp = float(summary.split("Peak:")[1].split("dBFS")[0])
    return i, tp


def write(path, sig):
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(sig, -1, 1) * 32767).astype("<i2").tobytes())


i, _ = lufs(music)
mix = music * 10 ** ((-14 - i) / 20)


def place(sound, at, peak_db):
    s = sound / np.abs(sound).max() * 10 ** (peak_db / 20)
    j = int(at * SR)
    if j >= n:
        return
    mix[j:j + len(s)] += s[: n - j]


sfx = edit["sfx"]
tick = decode(fetch("sfx", sfx["tick"]["id"]))
click = decode(fetch("sfx", sfx["click"]["id"]))

# A soft key tick as each opening line appears.
def key_frames(text, start, end):
    """Keystroke frames with a pause at spaces and punctuation (same formula as keyFrames in McpLaunch.tsx)."""
    w = [1.7 if ch == " " else 1.3 if ch in ".,?/:" else 1 for ch in text]
    cum, out = 0, []
    for x in w:
        cum += x
        out.append(start + (end - start) * cum / sum(w))
    return out


typing = edit.get("typing")
ticks = edit.get("ticks") or (key_frames(typing["text"], typing["from"], typing["to"]) if typing else [o["from"] for o in edit["opener"]])
for f in ticks:
    place(tick, f / FPS, sfx["tick"]["gain"])

# A click wherever the pointer clicks inside a SnapKit clip.
pointer = json.loads((ROOT / "src/inaction/buy-credits-events.json").read_text())["pointer"]
clicks = [p["t"] for p in pointer if p.get("click")]
for sl in edit.get("slots", []) + edit.get("sections", []):
    off = sl["clipAt"]
    for g in sl["clip"]["segs"]:
        if "video" in g and (g.get("pointer") or sl["clip"].get("pointer")):
            for t in clicks:
                if g["start"] <= t < g["start"] + g["len"] / FPS * g["rate"]:
                    place(click, (off + (t - g["start"]) / g["rate"] * FPS) / FPS - 0.005, sfx["click"]["gain"])
        off += g["len"]

# Clicks on interface buttons the edit lists by frame.
for f in edit.get("clicks", []):
    place(click, f / FPS - 0.005, sfx["click"]["gain"])

# Keep true peak under -1 dBTP.
i, tp = lufs(mix)
if tp > -1.0:
    mix *= 10 ** ((-1.0 - tp) / 20)
out = ROOT / f"public/audio/{NAME}-mix.wav"
write(out, mix)
i, tp = lufs(mix)
print(f"wrote {out} {total:.2f}s  {i:.1f} LUFS  peak {tp:.1f} dBFS")
