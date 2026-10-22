"""Mix for the SDK video: the licensed music edit (public/audio/sdk-music.wav,
"Proceed" by 1000 Handz, CC BY 4.0) plus quiet, unpitched UI sounds placed on
the frames listed in scripts/cues.json.

    npx tsx scripts/cues.ts && python3 scripts/make_audio.py
"""

import json
import pathlib
import wave

import numpy as np

ROOT = pathlib.Path(__file__).resolve().parent
C = json.loads((ROOT / "cues.json").read_text())
rng = np.random.default_rng(7)

with wave.open(str(ROOT.parent / "public/audio/sdk-music.wav")) as w:
    SR = w.getframerate()
    music = np.frombuffer(w.readframes(w.getnframes()), "<i2").reshape(-1, w.getnchannels()).astype(float) / 32767
if music.shape[1] == 1:
    music = np.repeat(music, 2, axis=1)
N = max(len(music), int(C["total"] / C["fps"] * SR))
music = np.pad(music, ((0, N - len(music)), (0, 0)))
sfx = np.zeros((N, 2))


def tt(sec):
    return np.arange(int(sec * SR)) / SR


def bandpass(sig, lo=None, hi=None):
    spec = np.fft.rfft(sig)
    f = np.fft.rfftfreq(len(sig), 1 / SR)
    g = np.ones_like(f)
    if hi:
        g *= 1 / (1 + (f / hi) ** 4)
    if lo:
        g *= 1 - 1 / (1 + (f / lo) ** 4)
    return np.fft.irfft(spec * g, len(sig))


def place(sig, at, gain, pan=0.0):
    i = int(round(at * SR))
    if i >= N:
        return
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    end = min(N, i + len(sig))
    sfx[i:end, 0] += sig[: end - i] * gain * l * 1.41
    sfx[i:end, 1] += sig[: end - i] * gain * r * 1.41


def key():
    t = tt(0.035)
    return bandpass(rng.normal(0, 1, len(t)), lo=1500, hi=7000) * np.exp(-t * 420)


def click():
    t = tt(0.11)
    a = bandpass(rng.normal(0, 1, len(t)), lo=1200, hi=6000) * np.exp(-t * 520)
    b = np.zeros_like(t)
    o = int(0.05 * SR)
    b[o:] = a[: len(t) - o] * 0.5
    return a + b


def tap():
    # A soft felt thump: low-passed noise burst, no pitch.
    t = tt(0.12)
    return bandpass(rng.normal(0, 1, len(t)), lo=80, hi=900) * np.exp(-t * 45)


for c in C["cues"]:
    at = c["f"] / C["fps"]
    v = c.get("v", 1)
    k = c["kind"]
    if k == "key":
        place(key(), at, 0.5 * v * rng.uniform(0.75, 1.1), rng.uniform(-0.2, 0.2))
    elif k == "back":
        place(bandpass(key(), hi=4000), at, 0.45 * v, rng.uniform(-0.15, 0.15))
    elif k == "space":
        place(bandpass(key(), hi=3000), at, 0.7 * v)
    elif k == "enter":
        place(bandpass(key(), hi=2500) * 2, at, 0.6)
    elif k == "click":
        place(click(), at, 0.7 * v)
    elif k == "tap":
        place(tap(), at, 1.1 * v, rng.uniform(-0.15, 0.15))
    else:
        raise ValueError(f"unknown cue kind {k!r}")

mix = music + sfx
peak = np.abs(mix).max()
if peak > 0.97:
    mix *= 0.97 / peak
out = ROOT.parent / "public/audio/mix.wav"
with wave.open(str(out), "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32767).astype("<i2").tobytes())
print(f"wrote {out}")
