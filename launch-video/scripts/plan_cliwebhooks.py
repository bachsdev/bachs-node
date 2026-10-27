"""Timing for "Test webhooks on your machine" (src/cliwebhooks/edit.json). Every command,
reply and delivery line comes from docs.bachs.io/developer-portal/local-testing; the
handler is our own example. Effects are placed from the same schedule as the picture."""

import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
FPS = 30
TOTAL = 930
END = 770  # 25.7 s: the track's lift


def keys(text, start, per):
    """One keystroke per character, a little slower on spaces."""
    out, t = [], start
    for ch in text:
        t += per * (1.6 if ch == " " else 1)
        out.append(round(t, 2))
    return out


LISTEN = "bachs listen --forward-to localhost:3000/webhooks"
TRIG1 = "bachs trigger collection.succeeded"
TRIG2 = "bachs trigger refund.paid"
REPLAY = "bachs events replay evt_7c1f22a94b0e4d1c9f3a6e2b8d5c7f10"
FIX = ["    case 'refund.paid':", "      await markRefunded(event);", "      break;"]

typing = []  # {pane, text, keys}


def type_(pane, text, start, per):
    k = keys(text, start, per)
    typing.append(dict(pane=pane, text=text, keys=k))
    return k[-1]


events = []
t = type_("listen", LISTEN, 20, 1.0)
ready = round(t + 10)
t = type_("trigger", TRIG1, 190, 1.0)
d1 = round(t + 16)
t = type_("trigger", TRIG2, 370, 1.0)
d2 = round(t + 16)
code = []
t = 520
for line in FIX:
    k = keys(line.lstrip(), t + 6, 1.1)
    code.append(dict(text=line, keys=k))
    t = k[-1] + 4
t = type_("trigger", REPLAY, max(612, round(t + 12)), 0.75)
d3 = round(t + 16)
ctrlc = 740

for ty in typing + code:
    events += [dict(sfx="key", at=f) for f in ty["keys"]]
events += [dict(sfx="key", at=ctrlc), dict(sfx="key", at=ctrlc + 3)]
events += [dict(sfx="blip", at=d1), dict(sfx="low", at=d2), dict(sfx="blip", at=d3), dict(sfx="confirm", at=d3 + 3)]
install = "npm install -g @bachs/cli"
inst = keys(install, END + 40, 0.9)
events += [dict(sfx="key", at=f) for f in inst]

edit = dict(
    _note="Bachs CLI, 'Test webhooks on your machine'. 30 fps. Music is Mixkit 588 'Feedback Dreams' (Eugenio Mininni), unedited from 9.58 s: its bass enters during the replay and its lift lands on the end card at 25.7 s. Light mode: single keystrokes, a blip per delivery (lower for the 500), one confirm on the replayed 200.",
    fps=FPS, total=TOTAL, endAt=END,
    music=dict(id=588, start=9.58, fade=1.5, lufs=-20),
    sfx=dict(key=dict(id=2538, peak=-29, pool=True), blip=dict(id=2568, peak=-22), low=dict(id=2569, peak=-23), confirm=dict(id=2580, peak=-24)),
    typing=typing, code=code, ready=ready, deliveries=[d1, d2, d3], ctrlc=ctrlc, codeFrom=520,
    install=dict(text=install, keys=inst),
    captions=[
        dict(at=ready + 12, text="Real sandbox events on your machine. No deploy, no tunnel."),
        dict(at=190, text="Send yourself any event, signed like a real one."),
        dict(at=370, text="See what your handler returned, for every delivery."),
        dict(at=520, text="Fix it, then replay the same event."),
    ],
    events=events,
)
(ROOT / "src/cliwebhooks/edit.json").write_text(json.dumps(edit, indent=1))
print("ready", ready, "deliveries", d1, d2, d3, "code ends", code[-1]["keys"][-1], "replay typed", typing[-1]["keys"][0], typing[-1]["keys"][-1])
