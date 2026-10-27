"""Sound for the light-mode videos: one Mixkit track played unedited from a chosen
start, plus a few effects placed where the edit says something appears on screen.

    python3 scripts/mix.py mcpsentences   # src/mcpsentences/edit.json -> public/audio/mcpsentences-mix.wav
    python3 scripts/mix.py cliwebhooks    # src/cliwebhooks/edit.json  -> public/audio/cliwebhooks-mix.wav

edit.json supplies:
    fps, total                     frame rate and length in frames
    music: {id, start, fade, lufs} track, where in it the video starts (s), end fade (s), bed loudness
    sfx: {name: {id, peak, pool?}} effects; peak is the effect's peak in dBFS. pool slices a
                                   recording of many keystrokes into single presses, so typing
                                   doesn't repeat one sample.
    events: [{sfx, at}]            frame of each effect

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
NAME = sys.argv[1]
edit = json.loads((ROOT / f"src/{NAME}/edit.json").read_text())
FPS = edit["fps"]
n = int(edit["total"] / FPS * SR)
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


def decode(path):
    cmd = ["ffmpeg", "-v", "error", "-i", str(path), "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"]
    return np.frombuffer(subprocess.run(cmd, capture_output=True, check=True).stdout, "<f4").reshape(-1, 2).astype(float)


def write(path, sig):
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(sig, -1, 1) * 32767).astype("<i2").tobytes())


def lufs(sig):
    tmp = ROOT / "out/.mix-measure.wav"
    tmp.parent.mkdir(exist_ok=True)
    write(tmp, sig)
    log = subprocess.run(["ffmpeg", "-v", "info", "-nostats", "-i", str(tmp), "-af", "ebur128=peak=true", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    tmp.unlink()
    summary = log[log.rfind("Summary:"):]
    return float(summary.split("I:")[1].split("LUFS")[0]), float(summary.split("Peak:")[1].split("dBFS")[0])


# The bed: unedited from music.start, faded out at the end, brought to music.lufs.
m = edit["music"]
track = decode(fetch("music", m["id"]))
bed = track[int(m["start"] * SR):][:n]
bed = np.pad(bed, ((0, n - len(bed)), (0, 0)))
fade = int(m.get("fade", 1.5) * SR)
bed[-fade:] *= np.linspace(1, 0, fade)[:, None] ** 2
i, _ = lufs(bed)
mix = bed * 10 ** ((m.get("lufs", -20) - i) / 20)


def slices(sig, count=24):
    """Single presses cut from a recording of many: 90 ms from each onset."""
    mono = np.abs(sig).mean(1)
    env = np.convolve(mono, np.ones(240) / 240, "same")
    thr = env.max() * 0.25
    out, j = [], 0
    while j < len(env) and len(out) < count:
        if env[j] > thr:
            a = max(0, j - 96)
            s = sig[a:a + int(0.09 * SR)].copy()
            s[-480:] *= np.linspace(1, 0, 480)[:, None]
            out.append(s)
            j += int(0.12 * SR)
        else:
            j += 48
    return out


sounds = {}
for name, s in edit["sfx"].items():
    raw = decode(fetch("sfx", s["id"]))
    sounds[name] = slices(raw) if s.get("pool") else [raw]

rng = np.random.default_rng(7)
for ev in edit["events"]:
    s = edit["sfx"][ev["sfx"]]
    pool = sounds[ev["sfx"]]
    snd = pool[rng.integers(len(pool))]
    peak = s["peak"] + rng.uniform(-1.5, 1.5) if s.get("pool") else s["peak"]
    snd = snd / np.abs(snd).max() * 10 ** (peak / 20)
    j = int(ev["at"] / FPS * SR)
    if j < n:
        mix[j:j + len(snd)] += snd[: n - j]

# Keep true peak under -1 dBTP, checking the samples before the file can clip them.
pk = np.abs(mix).max()
if pk > 10 ** (-1.5 / 20):
    mix *= 10 ** (-1.5 / 20) / pk
i, tp = lufs(mix)
if tp > -1.0:
    mix *= 10 ** ((-1.0 - tp) / 20)
out = ROOT / f"public/audio/{NAME}-mix.wav"
write(out, mix)
i, tp = lufs(mix)
print(f"wrote {out} {n / SR:.2f}s  {i:.1f} LUFS  peak {tp:.1f} dBFS  {len(edit['events'])} effects")
