"""Placeholder soundtrack for the skills video, built on the beat sheet
(src/skills/beats.json): a sparse opening, a build from bar 6, a stop on
bar 11 beat 4, the drop on bar 12, and a resolve on bar 20. Sound effects are
tuned to F major and placed from scripts/skills-cues.json.

This is a stand-in so the pacing can be judged; swap public/audio/skills-mix.wav
for a licensed track (or put one under these effects) when it arrives.

    npx tsx scripts/skills_cues.ts && python3 scripts/skills_audio.py
"""

import json
import pathlib
import wave

import numpy as np

SR = 48000
ROOT = pathlib.Path(__file__).resolve().parent
C = json.loads((ROOT / "skills-cues.json").read_text())
FPS, BPM = C["fps"], C["bpm"]
BEAT = 60 / BPM
BAR = BEAT * 4
T0 = C["offsetSec"]
DUR = C["total"] / FPS + 0.5
N = int(DUR * SR)
rng = np.random.default_rng(11)

music = np.zeros((N, 2))
drums = np.zeros((N, 2))
sfx = np.zeros((N, 2))
send = np.zeros((N, 2))


def pos(bar, beat=1.0):
    return T0 + ((bar - 1) * 4 + (beat - 1)) * BEAT


def tt(sec):
    return np.arange(int(sec * SR)) / SR


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def place(bus, sig, at, gain=1.0, pan=0.0):
    i = int(round(at * SR))
    if sig.ndim == 1:
        sig = np.stack([sig * np.cos((pan + 1) * np.pi / 4), sig * np.sin((pan + 1) * np.pi / 4)], axis=1) * np.sqrt(2)
    if i < 0:
        sig, i = sig[-i:], 0
    if i >= N:
        return
    end = min(N, i + len(sig))
    bus[i:end] += sig[: end - i] * gain


def fft_filter(sig, lo=None, hi=None, slope=2.0):
    spec = np.fft.rfft(sig)
    f = np.fft.rfftfreq(len(sig), 1 / SR)
    g = np.ones_like(f)
    if hi:
        g *= 1 / (1 + (f / hi) ** (2 * slope))
    if lo:
        g *= 1 - 1 / (1 + (f / lo) ** (2 * slope))
    return np.fft.irfft(spec * g, len(sig))


def fade(sig, a=0.004, r=0.05):
    n = len(sig)
    env = np.ones(n)
    na, nr = min(n, int(a * SR)), min(n, int(r * SR))
    env[:na] = np.linspace(0, 1, na)
    env[n - nr :] *= np.linspace(1, 0, nr)
    return sig * env


# ------------------------------------------------------------ instruments
def piano(n, length=2.6, vel=0.7):
    """Felt-ish piano: slightly inharmonic partials, each decaying at its own rate."""
    f0 = midi(n)
    t = tt(length)
    out = np.zeros_like(t)
    bright = 0.35 + vel * 0.5
    for k in range(1, 9):
        fk = f0 * k * np.sqrt(1 + 0.0004 * k * k)
        if fk > 12000:
            break
        amp = (1 / k**1.25) * (bright ** (k - 1))
        decay = 0.9 + k * 0.85 + f0 / 900
        out += amp * np.sin(2 * np.pi * fk * t + rng.uniform(0, 6.28)) * np.exp(-t * decay)
    hammer = fft_filter(rng.normal(0, 1, len(t)), lo=800, hi=4000) * np.exp(-t * 120) * 0.04
    return fade((out + hammer) * vel, 0.002, 0.3)


def pad(n, length):
    t = tt(length)
    out = np.zeros_like(t)
    for det in (-0.08, 0.0, 0.07):
        f = midi(n) * 2 ** (det / 12)
        for k in range(1, 7):
            out += np.sin(2 * np.pi * f * k * t + rng.uniform(0, 6.28)) / k**1.8
    env = np.minimum(1, t / 0.8) * np.minimum(1, (length - t) / 0.9).clip(0)
    return out * env / 3


def bass(n, length, vel=1.0):
    t = tt(length)
    f = midi(n)
    sig = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2 * f * t) + 0.08 * np.sin(2 * np.pi * 3 * f * t)
    return fade(sig * np.exp(-t * 2.2) * vel, 0.006, 0.06)


def kick(vel=1.0):
    t = tt(0.5)
    f = 46 + 95 * np.exp(-t * 32)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7.5)
    click = fft_filter(rng.normal(0, 1, len(t)), lo=1500, hi=6000) * np.exp(-t * 300) * 0.18
    return (body + click) * vel


def snare(vel=1.0, big=False):
    t = tt(0.45)
    tone = np.sin(2 * np.pi * 190 * t) * np.exp(-t * 22) * 0.5
    noise = fft_filter(rng.normal(0, 1, len(t)), lo=1200, hi=9000) * np.exp(-t * (11 if big else 16))
    return (tone + noise * 0.7) * vel


def hat(vel=1.0, open_=False):
    t = tt(0.3 if open_ else 0.07)
    n = fft_filter(rng.normal(0, 1, len(t)), lo=7000)
    return n * np.exp(-t * (14 if open_ else 70)) * vel


# F major. Fmaj9 – Dm9 – Bbmaj9 – Csus (bar loop of four)
CHORDS = [
    {"root": 41, "voice": [57, 60, 64, 67, 69]},  # F: A3 C4 E4 G4 A4
    {"root": 38, "voice": [57, 60, 64, 65, 69]},  # Dm9
    {"root": 46, "voice": [57, 62, 65, 69, 72]},  # Bbmaj9
    {"root": 48, "voice": [55, 60, 65, 67, 74]},  # Csus
]
MOTIF = [  # two-bar melody, (beat offset, midi, length in beats)
    (0, 76, 1), (1, 72, 0.5), (1.5, 74, 0.5), (2, 72, 1), (3, 69, 1),
    (4, 72, 1), (5, 69, 0.5), (5.5, 67, 0.5), (6, 69, 1.5), (7.5, 65, 0.5),
]


def chord_at(bar):
    return CHORDS[(bar - 1) % 4]


def human(x=0.007):
    return rng.normal(0, x)


STOP = pos(11, 4)          # everything cuts here
DROP = pos(12, 1)
END_BAR = C["endBar"]

for bar in range(1, END_BAR):
    b0 = pos(bar)
    ch = chord_at(bar)
    v = ch["voice"]

    # Piano: rolled whole chords to start, then a moving pattern.
    if bar <= 2 or bar >= 19:
        for i, n in enumerate(v):
            ring = 4.5 if bar == 20 else 2.8
            g = 0.26 if bar <= 2 else 0.3  # quiet open, quiet close: the drop is the loud part
            place(music, piano(n, ring, 0.42), b0 + i * 0.03 + human(), g, pan=(i - 2) * 0.18)
            place(send, piano(n, ring, 0.42), b0 + i * 0.03, g * 0.5)
        if bar == 20:
            place(music, piano(29, 5, 0.6), b0, 0.5)  # low F under the last chord
            place(music, piano(41, 5, 0.5), b0, 0.4)
    elif bar <= 5:
        for beat, idx in ((1, None), (2.5, None)):
            for i, n in enumerate(v[:4]):
                place(music, piano(n, 2.0, 0.45), pos(bar, beat) + i * 0.02 + human(), 0.42, pan=(i - 1.5) * 0.2)
        if bar == 5:  # lift: a rising run into bar 6
            run = [v[0], v[1], v[2], v[3], v[4], v[2] + 12, v[3] + 12, v[4] + 12]
            for k, n in enumerate(run):
                place(music, piano(n, 1.2, 0.35 + k * 0.04), pos(bar, 3 + k * 0.25) + human(0.004), 0.42, pan=-0.3 + k * 0.08)
    else:
        if pos(bar) >= STOP and bar < 12:
            continue
        # eighth-note arpeggio, a little softer on offbeats
        order = [0, 2, 3, 4, 3, 2, 1, 2]
        for k, idx in enumerate(order):
            at_ = pos(bar, 1 + k * 0.5) + human()
            if STOP <= at_ < DROP:
                continue
            vel = 0.42 if k % 2 == 0 else 0.32
            place(music, piano(v[idx], 1.4, vel), at_, 0.4, pan=(idx - 2) * 0.22)
            place(send, piano(v[idx], 1.4, vel), at_, 0.12)

    # Pad from the install onward, wider after the drop.
    if 3 <= bar < 20 and not (pos(bar) >= STOP and bar < 12):
        length = BAR * (1.0 if bar != 11 else 0.74)
        lvl = 0.03 if bar < 6 else 0.05 if bar < 12 else 0.07 if bar < 19 else 0.035
        for i, n in enumerate(v[1:4]):
            p = pad(n, length + 0.3)
            place(music, p, b0, lvl, pan=(i - 1) * 0.5)
            place(send, p, b0, lvl * 0.5)

    # Bass: soft pulse from bar 3, driving from the drop.
    if 3 <= bar <= 18:
        steps = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5]
        for k, s in enumerate(steps):
            at_ = pos(bar, 1 + s)
            if STOP <= at_ < DROP:
                continue
            if bar < 6 and k % 2:
                continue
            octave = 12 if (bar >= 12 and k in (3, 7)) else 0
            vel = 0.55 if bar < 6 else 0.75 if bar < 12 else 1.0
            place(music, bass(ch["root"] + octave, BEAT * 0.48, vel), at_, 0.2)

    # Drums.
    if 6 <= bar <= 18:
        if bar < 10:
            pattern_k = [1, 3]
            pattern_s = [2, 4]
        elif bar < 12:
            pattern_k = [1] if bar == 10 else [1]
            pattern_s = []
        else:
            pattern_k = [1, 2.5, 3]
            pattern_s = [2, 4]
        for b in pattern_k:
            at_ = pos(bar, b)
            if STOP <= at_ < DROP:
                continue
            place(drums, kick(1.0 if bar >= 12 else 0.8), at_, 0.42)
        for b in pattern_s:
            sn = snare(0.9 if bar >= 12 else 0.6, big=bar >= 12)
            place(drums, sn, pos(bar, b) + human(0.004), 0.22, pan=0.05)
            place(send, sn, pos(bar, b), 0.1)
        sub = 4 if bar >= 12 or bar in (10, 11) else 2
        for k in range(4 * sub):
            at_ = pos(bar, 1 + k / sub) + (0.012 if (k % 2 and sub == 4) else 0)  # light swing
            if STOP <= at_ < DROP:
                continue
            vel = (0.55 if k % sub == 0 else 0.33) * rng.uniform(0.8, 1.1)
            place(drums, hat(vel, open_=(k == 4 * sub - 2 and bar % 2 == 0)), at_, 0.1, pan=0.25)
        if bar == 11:  # snare roll that accelerates into the stop
            t_ = pos(11, 1)
            step = BEAT / 2
            while t_ < STOP - 0.02:
                frac = (t_ - pos(11, 1)) / (STOP - pos(11, 1))
                place(drums, snare(0.25 + frac * 0.6), t_, 0.2)
                step = max(BEAT / 8, step * 0.86)
                t_ += step

    # Melody after the drop: a simple two-bar motif, an octave up in 17–18.
    if 12 <= bar <= 18 and bar % 2 == 0:
        up = 12 if bar >= 16 else 0
        for off, n, ln in MOTIF:
            at_ = pos(bar, 1 + off) + human(0.005)
            p = piano(n + up, max(0.6, ln * BEAT * 1.6), 0.6)
            place(music, p, at_, 0.42, pan=0.1)
            place(send, p, at_, 0.22)

# Riser across bars 10–11, cut dead on the stop.
rlen = STOP - pos(10)
t = tt(rlen)
noise = rng.normal(0, 1, len(t))
riser = np.zeros_like(t)
hop = 1024
for i in range(0, len(t), hop):
    seg = noise[i : i + 2048]
    fc = 300 * (9000 / 300) ** (i / len(t))
    riser[i : i + len(seg)] += fft_filter(seg * np.hanning(len(seg)), lo=fc * 0.6, hi=fc * 1.6)[: len(seg)] * 0.5
riser *= (t / rlen) ** 2.2
tone = np.sin(2 * np.pi * np.cumsum(220 * 2 ** (2 * t / rlen)) / SR) * (t / rlen) ** 3 * 0.12
place(music, riser * 0.08 + tone, pos(10), 1.0)

# Sidechain: duck music under kicks after the drop.
duck = np.ones(N)
for bar in range(12, 19):
    for b in (1, 2.5, 3):
        i0 = int(pos(bar, b) * SR)
        dl = int(0.28 * SR)
        if i0 + dl < N:
            duck[i0 : i0 + dl] = np.minimum(duck[i0 : i0 + dl], 1 - 0.35 * np.exp(-np.arange(dl) / SR * 10))
music *= duck[:, None]


# ------------------------------------------------------------ effects
def key_click():
    t = tt(0.04)
    tone = np.sin(2 * np.pi * rng.uniform(1700, 2500) * t) * np.exp(-t * 260)
    snap = fft_filter(rng.normal(0, 1, len(t)), lo=1800, hi=8000) * np.exp(-t * 380)
    return (0.3 * tone + snap) / 4


def mallet(n, length=0.9):
    t = tt(length)
    f = midi(n)
    s = np.sin(2 * np.pi * f * t) * np.exp(-t * 6) + 0.25 * np.sin(2 * np.pi * 4 * f * t) * np.exp(-t * 28)
    return fade(s, 0.002, 0.1)


def soft_pop(n):
    t = tt(0.35)
    f = midi(n) * (1 + 0.04 * np.exp(-t * 60))
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 11) + 0.15 * np.sin(2 * np.pi * 2 * midi(n) * t) * np.exp(-t * 20)
    return fade(s, 0.002, 0.05)


def grains(length, density, lo, hi, decay):
    t = tt(length)
    out = np.zeros_like(t)
    for _ in range(int(density * length)):
        i = rng.integers(0, len(t) - 200)
        g = rng.normal(0, 1, 200) * np.exp(-np.arange(200) / 30)
        out[i : i + 200] += g * rng.uniform(0.3, 1)
    return fft_filter(out, lo=lo, hi=hi) * np.exp(-t * decay)


for c in C["cues"]:
    at_ = c["f"] / FPS
    v = c.get("v", 1)
    k = c["kind"]
    n = c.get("note")
    if k == "key":
        place(sfx, key_click(), at_, 0.45 * v * rng.uniform(0.75, 1.1), pan=rng.uniform(-0.2, 0.2))
    elif k == "space":
        place(sfx, fft_filter(key_click(), hi=3200), at_, 0.7 * v)
    elif k == "enter":
        place(sfx, fft_filter(key_click(), hi=2400) * 2.2, at_, 0.8)
    elif k == "mallet":
        m = mallet(n)
        place(sfx, m, at_, 0.16 * v)
        place(send, m, at_, 0.08 * v)
    elif k == "pop":
        p = soft_pop(n)
        place(sfx, p, at_, 0.17 * v, pan=rng.uniform(-0.25, 0.25))
        place(send, p, at_, 0.07 * v)
    elif k == "paper":
        place(sfx, grains(0.35, 260, 1500, 9000, 9), at_ - 0.05, 0.11)
    elif k == "swipe":
        t = tt(0.75)
        sw = fft_filter(rng.normal(0, 1, len(t)), lo=2200, hi=5500) * np.sin(np.linspace(0, np.pi, len(t))) ** 1.5
        place(sfx, sw * (1 + 0.3 * np.sin(2 * np.pi * 18 * t)), at_, 0.035)
    elif k == "drop":
        t = tt(1.6)
        boom = np.sin(2 * np.pi * np.cumsum(38 + 40 * np.exp(-t * 8)) / SR) * np.exp(-t * 2.4)
        air = fft_filter(rng.normal(0, 1, len(t)), hi=2500) * np.exp(-t * 5) * 0.25
        place(sfx, boom + air, at_, 0.38)
        place(send, air, at_, 0.15)
    elif k == "printer":
        t = tt(0.42)
        buzz = fft_filter(rng.normal(0, 1, len(t)), lo=900, hi=4200) * (0.55 + 0.45 * np.sign(np.sin(2 * np.pi * rng.uniform(52, 64) * t)))
        place(sfx, fade(buzz, 0.01, 0.06), at_, 0.04 * v, pan=0.1)
    elif k == "stamp":
        t = tt(0.3)
        thump = np.sin(2 * np.pi * np.cumsum(70 + 80 * np.exp(-t * 40)) / SR) * np.exp(-t * 18)
        wood = fft_filter(rng.normal(0, 1, len(t)), lo=600, hi=3000) * np.exp(-t * 90) * 0.4
        place(sfx, thump + wood, at_, 0.45)
        place(send, wood, at_, 0.1)

# ------------------------------------------------------------ reverb + master
ir_len = int(2.2 * SR)
ti = np.arange(ir_len) / SR
ir = np.stack([rng.normal(0, 1, ir_len), rng.normal(0, 1, ir_len)], axis=1) * np.exp(-ti * 3.0)[:, None]
for ch in range(2):
    ir[:, ch] = fft_filter(ir[:, ch], lo=200, hi=6000)
ir /= np.sqrt((ir**2).sum(axis=0))
size = 1 << int(np.ceil(np.log2(N + ir_len)))
wet = np.zeros_like(send)
for ch in range(2):
    wet[:, ch] = np.fft.irfft(np.fft.rfft(send[:, ch], size) * np.fft.rfft(ir[:, ch], size), size)[:N]

mix = music + drums + sfx + wet * 0.8
# Hard silence for the stop (bar 11 beat 4), apart from reverb tails being cut cleanly.
i0, i1 = int(STOP * SR), int(DROP * SR)
mix[i0:i1] *= 0.02
mix = np.tanh(mix * 1.4) / 1.4
fo = int(0.5 * SR)
mix[-fo:] *= np.linspace(1, 0, fo)[:, None]
mix *= 0.62 / np.abs(mix).max()  # about -14 LUFS

out = ROOT.parent / "public" / "audio" / "skills-mix.wav"
with wave.open(str(out), "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32767).astype("<i2").tobytes())
print(f"wrote {out} ({DUR:.1f}s)")
