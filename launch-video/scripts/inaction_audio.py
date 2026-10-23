"""Sound for "Bachs in action" #1: a music bed ("Plenty of Help" by Ketsa, CC BY 4.0)
plus a soft click on every real click in the recording.

    python3 scripts/inaction_audio.py
"""

import json
import pathlib
import subprocess
import wave

import numpy as np

ROOT = pathlib.Path(__file__).resolve().parent.parent
SR = 48000
ev = json.loads((ROOT / "src/inaction/buy-credits-events.json").read_text())
holds = json.loads((ROOT / "src/inaction/buy-credits-edit.json").read_text())["holds"]
cut = json.loads((ROOT / "src/inaction/buy-credits-edit.json").read_text())["cut"]
total = cut + sum(h["len"] for h in holds) + 2.6  # recording + frame holds + end card

raw = subprocess.run(
    ["ffmpeg", "-v", "error", "-i", str(ROOT / "public/audio/licensed/ketsa-plenty-of-help.mp3"),
     "-t", f"{total:.3f}", "-af", f"afade=t=in:d=0.4,afade=t=out:st={total - 1.6:.3f}:d=1.6,loudnorm=I=-16:TP=-1.5:LRA=11",
     "-ac", "2", "-ar", str(SR), "-f", "s16le", "-"],
    capture_output=True, check=True).stdout
mix = np.frombuffer(raw, "<i2").reshape(-1, 2).astype(float) / 32767
n = int(total * SR)
mix = np.pad(mix, ((0, max(0, n - len(mix))), (0, 0)))[:n]

rng = np.random.default_rng(3)
def click():
    t = np.arange(int(0.1 * SR)) / SR
    spec = np.fft.rfft(rng.normal(0, 1, len(t)))
    f = np.fft.rfftfreq(len(t), 1 / SR)
    spec *= (1 - 1 / (1 + (f / 1300) ** 4)) / (1 + (f / 5500) ** 4)
    a = np.fft.irfft(spec, len(t)) * np.exp(-t * 520)
    b = np.zeros_like(a)
    o = int(0.045 * SR)
    b[o:] = a[:-o] * 0.5
    return a + b

for p in ev["pointer"]:
    if p.get("click") and p["t"] < cut:
        i = int((p["t"] + sum(h["len"] for h in holds if p["t"] > h["at"])) * SR)
        c = click() * 0.55
        mix[i:i + len(c)] += c[: len(mix) - i, None]

mix *= min(1.0, 0.97 / np.abs(mix).max())
out = ROOT / "public/audio/buy-credits-mix.wav"
with wave.open(str(out), "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype("<i2").tobytes())
print("wrote", out, f"{total:.1f}s")
