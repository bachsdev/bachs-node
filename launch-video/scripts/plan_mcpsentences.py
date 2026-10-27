"""Timing for "Into sentences" (src/mcpsentences/edit.json): four beats in the brief's
windows, each question typed, its answer cells lifted into one sentence, then held.
Effects are placed from the same schedule so picture and sound can't drift apart."""

import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
FPS = 30
QUESTIONS = [
    "What lands in my account on Friday?",
    "Which payments failed this week, and why?",
    "Do I have disputes I need to respond to?",
    "Why can't I get paid out?",
]
WINDOWS = [45, 240, 465, 670, 860]  # 1.5 s, 8 s, 15.5 s, 22.3 s, 28.7 s
TOTAL = 1020


def key_frames(text, start, end):
    """Keystroke frames with a pause at spaces and punctuation (same as keyFrames in McpLaunch.tsx)."""
    w = [1.7 if ch == " " else 1.3 if ch in ".,?/:'" else 1 for ch in text]
    cum, out = 0, []
    for x in w:
        cum += x
        out.append(round(start + (end - start) * cum / sum(w), 2))
    return out


beats, events = [], []
for i, q in enumerate(QUESTIONS):
    w0, w1 = WINDOWS[i], WINDOWS[i + 1]
    t0 = w0 + 14
    t1 = t0 + round(len(q) * 1.2)
    lift = t1 + 18
    settle = lift + 44
    beats.append(dict(q=q, at=w0, end=w1, typeFrom=t0, typeTo=t1, light=t1 + 8, lift=lift, settle=settle))
    events += [dict(sfx="key", at=f) for f in key_frames(q, t0, t1)]
    events += [dict(sfx="shuffle", at=lift), dict(sfx="chime", at=settle - 2)]

edit = dict(
    _note="Bachs MCP, 'Into sentences'. 30 fps. Music is Mixkit 760 'Relaxation 07' (Lily J), unedited from 24.85 s, so its lift at 53.5 s lands on the end card at 28.7 s. Light mode: key taps while a question types, a paper shuffle when the answer cells lift, one chime as the sentence settles.",
    fps=FPS, total=TOTAL, endAt=WINDOWS[-1],
    music=dict(id=760, start=24.85, fade=1.5, lufs=-20),
    sfx=dict(key=dict(id=1125, peak=-30), shuffle=dict(id=2383, peak=-27), chime=dict(id=2867, peak=-24)),
    beats=beats, events=events,
)
(ROOT / "src/mcpsentences/edit.json").write_text(json.dumps(edit, indent=1))
for b in beats:
    print(b)
