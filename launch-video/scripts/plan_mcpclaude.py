"""Timing for "Bachs MCP in Claude" (src/mcpclaude/edit.json): two questions in Claude Code,
then one in the Claude app that comes back as a chart. Claude Code's screens follow
captures of the real CLI (v2.1.312) talking to the Bachs docs MCP server. Effects are
placed from the same schedule as the picture."""

import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
FPS = 30
TOTAL = 1020
END = 870  # 29 s: the track's lift


def keys(text, start, per):
    out, t = [], start
    for ch in text:
        t += per * (1.6 if ch == " " else 1)
        out.append(round(t, 2))
    return out


CC = [
    dict(q="are my webhooks failing?", start=50, per=1.3),
    dict(q="why did my checkout API call fail this morning?", start=264, per=1.05),
]
for x in CC:
    x["keys"] = keys(x["q"], x["start"], x["per"])
    x["enter"] = round(x["keys"][-1] + 6)
    x["calling"] = x["enter"] + 4
    x["called"] = x["calling"] + 50
    x["answer"] = [x["called"] + 6, x["called"] + 52]
    x["baked"] = x["answer"][1] + 4
APP = dict(q="What settles each day next week? Chart it.", start=526, per=1.15)
APP["keys"] = keys(APP["q"], APP["start"], APP["per"])
APP["send"] = round(APP["keys"][-1] + 6)
APP["calling"] = APP["send"] + 10
APP["called"] = APP["calling"] + 46
APP["chart"] = [APP["called"] + 8, APP["called"] + 50]
APP["bars"] = [APP["called"] + 26, APP["called"] + 90]
APP["answer"] = [APP["bars"][1] + 4, APP["bars"][1] + 40]

SHOTS = [[0, "all"], [22, "all"], [46, "terminal"], [488, "terminal"], [516, "app"], [838, "app"], [862, "all"]]

events = []
for x in CC:
    events += [dict(sfx="key", at=f) for f in x["keys"]] + [dict(sfx="key", at=x["enter"])]
    events += [dict(sfx="called", at=x["called"])]
events += [dict(sfx="key", at=f) for f in APP["keys"]] + [dict(sfx="key", at=APP["send"]), dict(sfx="called", at=APP["called"]), dict(sfx="chart", at=APP["bars"][0])]

edit = dict(
    _note="Bachs MCP in Claude. 30 fps. Music is Mixkit 251 'Ambient' (Arulo), unedited from 42.3 s, so its lift at 71.3 s lands on the end card at 29 s. Light mode: single keystrokes, a short tone when a Bachs call returns, one chime as the chart draws.",
    fps=FPS, total=TOTAL, endAt=END,
    music=dict(id=251, start=42.3, fade=1.5, lufs=-20),
    sfx=dict(key=dict(id=2537, peak=-30, pool=True), called=dict(id=2570, peak=-31), chart=dict(id=1106, peak=-27)),
    cc=CC, app=APP, shots=SHOTS, events=events,
)
(ROOT / "src/mcpclaude/edit.json").write_text(json.dumps(edit, indent=1))
for x in CC:
    print("cc", x["start"], x["enter"], x["called"], x["answer"], x["baked"])
print("app", APP["start"], APP["send"], APP["called"], APP["chart"], APP["bars"], APP["answer"])
