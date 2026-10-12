"""Synthesizes the launch video's soundtrack: a warm music bed plus UI sound
effects placed on the exact frames listed in scripts/cues.json.

Everything is generated from scratch (numpy only), so the result is
royalty-free. Swap public/audio/mix.wav for a licensed track any time.

    npx tsx scripts/cues.ts && python3 scripts/make_audio.py
"""

import json
import pathlib
import wave

import numpy as np

SR = 48000
ROOT = pathlib.Path(__file__).resolve().parent
cues = json.loads((ROOT / "cues.json").read_text())
FPS = cues["fps"]
DUR = cues["total"] / FPS + 1.5
N = int(DUR * SR)
rng = np.random.default_rng(7)

music = np.zeros((N, 2))
sfx = np.zeros((N, 2))
send = np.zeros((N, 2))  # reverb bus


def t_of(sec):
    return np.arange(int(sec * SR)) / SR


def place(bus, sig, at, gain=1.0, pan=0.0):
    i = int(at * SR)
    if i >= N:
        return
    if sig.ndim == 1:
        left = np.cos((pan + 1) * np.pi / 4)
        right = np.sin((pan + 1) * np.pi / 4)
        sig = np.stack([sig * left, sig * right], axis=1) * np.sqrt(2)
    if i < 0:
        sig, i = sig[-i:], 0
    end = min(N, i + len(sig))
    bus[i:end] += sig[: end - i] * gain


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def adsr(n, a, r, sustain_shape=None):
    env = np.ones(n)
    na, nr = int(a * SR), int(r * SR)
    na = min(na, n)
    env[:na] = np.linspace(0, 1, na) ** 1.5
    if nr and nr < n:
        env[-nr:] *= np.linspace(1, 0, nr) ** 1.3
    return env


def fft_filter(sig, lo=None, hi=None, slope=2.0):
    spec = np.fft.rfft(sig)
    f = np.fft.rfftfreq(len(sig), 1 / SR)
    g = np.ones_like(f)
    if hi:
        g *= 1 / (1 + (f / hi) ** (2 * slope))
    if lo:
        g *= 1 - 1 / (1 + (f / max(lo, 1)) ** (2 * slope))
    return np.fft.irfft(spec * g, len(sig))


# ----------------------------------------------------------------- music
BPM = 100
BEAT = 60 / BPM
BAR = BEAT * 4

# Dmaj9 – Bm9 – Gmaj7(#11) – A6/9: warm, hopeful, no hard resolution until the end.
CHORDS = [
    [50, 57, 61, 64, 66, 69],
    [47, 54, 57, 61, 62, 66],
    [43, 50, 54, 57, 59, 61],
    [45, 52, 54, 57, 59, 64],
]


def pad_voice(freq, length):
    t = t_of(length)
    out = np.zeros_like(t)
    for det in (-0.07, 0.0, 0.065):
        f = freq * 2 ** (det / 12)
        phase = rng.uniform(0, 2 * np.pi)
        for h in range(1, 7):
            out += np.sin(2 * np.pi * f * h * t + phase * h) / h**1.6
    return out / 3


def pluck(freq, length, bright=0.5):
    # Karplus–Strong: a plucked string that decays naturally, never identical twice.
    n = int(length * SR)
    p = max(2, int(SR / freq))
    buf = rng.uniform(-1, 1, p)
    buf = fft_filter(np.tile(buf, 4), hi=2000 + 5000 * bright)[:p]
    out = np.zeros(n)
    out[:p] = buf
    damp = 0.996
    for start in range(p, n, p):
        prev = out[start - p : start]
        nxt = 0.5 * (prev + np.roll(prev, 1)) * damp
        end = min(n, start + p)
        out[start:end] = nxt[: end - start]
    return out * adsr(n, 0.002, 0.08)


def kick():
    t = t_of(0.45)
    f = 45 + 85 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t * 9)
    click = rng.normal(0, 1, len(t)) * np.exp(-t * 400) * 0.25
    return body + fft_filter(click, hi=4000)


def shaker():
    t = t_of(0.09)
    n = rng.normal(0, 1, len(t))
    return fft_filter(n, lo=6000) * np.exp(-t * 55)


def bar_time(b):
    return 0.15 + b * BAR


bars = int(DUR / BAR) + 1
scene = {s["id"]: s["from"] / FPS for s in cues["scenes"]}
drums_on = scene["install"]
drums_off = scene["outro"] + 0.4
success_t = scene["checkout"] + (json.loads((ROOT.parent / "src" / "timeline.json").read_text())["checkout"]["pay"] + 12) / FPS

duck = np.ones(N)
for b in range(bars):
    start = bar_time(b)
    if start > DUR - 1:
        break
    chord = CHORDS[b % 4]
    last = start + BAR > scene["outro"] + 1.2
    length = BAR * (2.4 if last else 1.15)
    # Pad: soft at first, opening up once the story gets going.
    lvl = 0.05 if start < scene["snapkit"] else 0.07
    for i, note in enumerate(chord[1:]):
        v = pad_voice(midi(note), length) * adsr(int(length * SR), 0.6, 0.9 if not last else 2.5)
        place(music, v, start, lvl, pan=(i - 2) * 0.25)
        place(send, v, start, lvl * 0.6, pan=(i - 2) * 0.25)
    if last:
        break

    # Plucked arpeggio from the SnapKit reveal onward, with human timing drift.
    if start >= scene["snapkit"] - BEAT:
        pattern = [1, 3, 2, 4, 3, 5, 4, 2]
        for k, idx in enumerate(pattern):
            at = start + k * BEAT / 2 + rng.normal(0, 0.006)
            if abs(at - success_t) < 0.9:
                continue  # leave room for the payment chime
            vel = 0.55 + 0.25 * (k % 2 == 0) + rng.uniform(-0.08, 0.08)
            pl = pluck(midi(chord[idx] + 12), 1.4, bright=vel)
            pan = rng.uniform(-0.45, 0.45)
            place(music, pl, at, 0.16 * vel, pan)
            place(send, pl, at, 0.07 * vel, pan)

    # Bass + light groove for the middle of the film.
    if drums_on - BEAT <= start < drums_off:
        for k in range(4):
            at = start + k * BEAT
            if abs(at - success_t) < 0.7:
                continue
            bt = t_of(BEAT * 0.9)
            bass = np.sin(2 * np.pi * midi(chord[0] - 12) * bt) + 0.25 * np.sin(2 * np.pi * midi(chord[0]) * bt)
            place(music, bass * adsr(len(bt), 0.01, 0.15) * np.exp(-bt * 1.5), at, 0.11)
            if k in (0, 2) or (k == 3 and b % 2 == 1):
                place(music, kick(), at, 0.32)
                i0 = int(at * SR)
                dl = int(0.3 * SR)
                if i0 + dl < N:
                    duck[i0 : i0 + dl] = np.minimum(duck[i0 : i0 + dl], 1 - 0.45 * np.exp(-np.arange(dl) / SR * 9))
            for s in range(2):
                sh_at = at + s * BEAT / 2 + 0.006 * rng.normal()
                place(music, shaker(), sh_at, (0.05 if s else 0.03) * rng.uniform(0.7, 1.1), pan=0.3)

music *= duck[:, None]

# ------------------------------------------------------------------- sfx


def noise_sweep(length, f0, f1, width=0.6):
    """Band-passed noise whose centre glides from f0 to f1 (a whoosh)."""
    n = int(length * SR)
    src = rng.normal(0, 1, n + 4096)
    out = np.zeros(n + 4096)
    hop, win = 512, 2048
    w = np.hanning(win)
    freqs = np.fft.rfftfreq(win, 1 / SR)
    for i in range(0, n, hop):
        frac = i / n
        fc = f0 * (f1 / f0) ** frac
        g = np.exp(-0.5 * (np.log(freqs + 1) - np.log(fc)) ** 2 / width**2)
        seg = np.fft.irfft(np.fft.rfft(src[i : i + win] * w) * g, win)
        out[i : i + win] += seg
    out = out[:n]
    env = np.sin(np.linspace(0, np.pi, n)) ** 2
    return out * env / (np.abs(out).max() + 1e-9)


def key_click():
    t = t_of(0.04)
    tone = np.sin(2 * np.pi * rng.uniform(1600, 2600) * t) * np.exp(-t * 260)
    snap_ = fft_filter(rng.normal(0, 1, len(t)), lo=1800, hi=9000) * np.exp(-t * 380)
    return (0.35 * tone + snap_) / 4


def mouse_click():
    t = t_of(0.12)
    a = fft_filter(rng.normal(0, 1, len(t)), lo=1200, hi=7000) * np.exp(-t * 500)
    b = np.zeros_like(t)
    off = int(0.055 * SR)
    b[off:] = a[: len(t) - off] * 0.55
    return (a + b) / 3


def blip(f0, f1, length=0.12):
    t = t_of(length)
    f = f1 + (f0 - f1) * np.exp(-t * 40)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 26)


def bell(freq, length=2.2, bright=1.0):
    t = t_of(length)
    out = np.zeros_like(t)
    for ratio, amp, decay in ((1, 1, 2.2), (2.0, 0.35 * bright, 3.5), (2.76, 0.25 * bright, 4.5), (5.4, 0.12 * bright, 7)):
        out += amp * np.sin(2 * np.pi * freq * ratio * t) * np.exp(-t * decay)
    return out * adsr(len(t), 0.003, 0.2) / 1.7


def mallet(freq):
    t = t_of(0.5)
    return (np.sin(2 * np.pi * freq * t) + 0.3 * np.sin(2 * np.pi * freq * 4 * t) * np.exp(-t * 30)) * np.exp(-t * 9)


for c in cues["cues"]:
    at = c["f"] / FPS
    v = c.get("v", 1)
    k = c["kind"]
    if k == "key":
        place(sfx, key_click(), at, 0.5 * v * rng.uniform(0.7, 1.15), pan=rng.uniform(-0.25, 0.25))
    elif k == "back":
        # Backspace: a little duller and lower than a letter key.
        place(sfx, fft_filter(key_click(), hi=4000), at, 0.55 * v * rng.uniform(0.8, 1.1), pan=rng.uniform(-0.15, 0.15))
    elif k == "space":
        place(sfx, fft_filter(key_click(), hi=3000), at, 0.8 * v, pan=rng.uniform(-0.1, 0.1))
    elif k == "enter":
        place(sfx, fft_filter(key_click(), hi=2500) * 2.4, at, 0.9)
    elif k == "click":
        place(sfx, mouse_click(), at, 0.9 * v)
    elif k in ("whoosh", "swoosh", "rise"):
        length, f0, f1 = {"whoosh": (0.55, 300, 2400), "swoosh": (0.4, 600, 3500), "rise": (1.3, 200, 1800)}[k]
        w = noise_sweep(length, f0, f1)
        place(sfx, w, at - length * 0.45, 0.13 * v, pan=-0.2)
        place(sfx, noise_sweep(length, f0 * 1.1, f1 * 1.1), at - length * 0.45, 0.13 * v, pan=0.2)
        place(send, w, at - length * 0.45, 0.05 * v)
    elif k == "pop":
        p = blip(950, 520) * 0.6
        air = fft_filter(rng.normal(0, 1, int(0.03 * SR)), lo=2000) * 0.08
        p[: len(air)] += air * np.linspace(1, 0, len(air))
        place(sfx, p, at, 0.35 * v)
        place(send, p, at, 0.12 * v)
    elif k == "tick":
        t = t_of(0.05)
        place(sfx, np.sin(2 * np.pi * 2900 * t) * np.exp(-t * 120), at, 0.12 * v)
    elif k == "success":
        for i, n in enumerate((88, 95)):
            m = mallet(midi(n))
            place(sfx, m, at + i * 0.085, 0.16 * v)
            place(send, m, at + i * 0.085, 0.1 * v)
    elif k == "chime":
        for i, n in enumerate((86, 90, 93, 98)):
            b = bell(midi(n), 2.8)
            place(sfx, b, at + i * 0.07, 0.11, pan=(i - 1.5) * 0.2)
            place(send, b, at + i * 0.07, 0.12, pan=(i - 1.5) * 0.2)
    elif k == "bloom":
        # A reversed swell landing on a soft bell chord.
        sw = noise_sweep(1.0, 400, 4000, width=0.9) * np.linspace(0, 1, SR) ** 3
        place(sfx, sw, at - 0.9, 0.06)
        for i, n in enumerate((74, 78, 81, 86)):
            b = bell(midi(n), 3.0, bright=0.6)
            place(sfx, b, at + i * 0.012, 0.07)
            place(send, b, at + i * 0.012, 0.12)
    elif k == "shimmer":
        for i, n in enumerate((93, 98, 102, 105)):
            b = bell(midi(n), 1.6, bright=0.4)
            place(sfx, b, at + i * 0.05, 0.035 * v, pan=(i - 1.5) * 0.4)
            place(send, b, at + i * 0.05, 0.06 * v)
    elif k == "swell":
        place(sfx, noise_sweep(1.2, 250, 900, width=0.5), at - 0.3, 0.06)

# ---------------------------------------------------------------- reverb
ir_len = int(2.6 * SR)
tt = np.arange(ir_len) / SR
ir = np.stack([rng.normal(0, 1, ir_len), rng.normal(0, 1, ir_len)], axis=1) * np.exp(-tt * 2.6)[:, None]
ir[:, 0] = fft_filter(ir[:, 0], hi=5000)
ir[:, 1] = fft_filter(ir[:, 1], hi=5000)
ir /= np.sqrt((ir**2).sum(axis=0))
size = 1 << int(np.ceil(np.log2(N + ir_len)))
wet = np.zeros_like(send)
for ch in range(2):
    wet[:, ch] = np.fft.irfft(np.fft.rfft(send[:, ch], size) * np.fft.rfft(ir[:, ch], size), size)[:N]

mix = music + sfx + wet * 0.9

# Fade the bed in and out, soft-clip, normalise.
fade_in = int(0.25 * SR)
mix[:fade_in] *= np.linspace(0, 1, fade_in)[:, None]
fade_out = int(1.4 * SR)
mix[-fade_out:] *= np.linspace(1, 0, fade_out)[:, None] ** 2
mix = np.tanh(mix * 1.6) / 1.6
mix *= 0.74 / np.abs(mix).max()  # lands around -14 LUFS, the usual web target

out = ROOT.parent / "public" / "audio" / "mix.wav"
out.parent.mkdir(parents=True, exist_ok=True)
with wave.open(str(out), "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32767).astype("<i2").tobytes())
print(f"wrote {out} ({DUR:.1f}s)")
