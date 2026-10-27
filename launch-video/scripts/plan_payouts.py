"""Timing for "Global Payouts" (src/payouts/edit.json): the dashboard's withdrawal flow
four times, to four kinds of destination, then an auto-payout. Fees are the default
rates on docs.bachs.io/for-you/fees; exchange rates are examples, labelled on screen.
Effects are placed from the same schedule as the picture."""

import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
FPS = 30
TOTAL = 1020
END = 870  # 29 s: the track's lift

PAYOUTS = [
    dict(dest=0, src="USD", amount=1200.00, rate="$1 = £0.74", fee=12.00, receive="£888.00", recv_num=888.00, recv_sym="£",
         caption="Pay out to a UK bank in GBP, from your USD balance.", status="On its way to your bank."),
    dict(dest=1, src="USD", amount=300.00, rate="$1 = KSh 129.20", fee=3.00, receive="KSh 38,760.00", recv_num=38760.00, recv_sym="KSh ",
         caption="Or to M-Pesa in Kenya.", status="On its way to your wallet."),
    dict(dest=2, src="USD", amount=2000.00, rate="$1 = 1.00 USDC", fee=20.00, receive="2,000.00 USDC", recv_num=2000.00, recv_sym="",
         caption="Or to a USDC wallet on Base.", status="On its way to your wallet."),
    dict(dest=3, src="NGN", amount=750000.00, rate=None, fee=50.00, receive="₦750,000.00", recv_num=750000.00, recv_sym="₦",
         caption="Or to your Nigerian bank, straight from your NGN balance.", status="On its way to your bank."),
]
STARTS = [90, 330, 470, 610]
AUTO = 750

events = [dict(sfx="press", at=64)]
for i, (p, s) in enumerate(zip(PAYOUTS, STARTS)):
    q = 1.0 if i == 0 else 0.6  # the first payout is shown at full pace, the rest quicker
    T = lambda x: round(s + x * q)
    p.update(at=s, slide=[T(0), T(20)], roll=[T(22), T(48)], rows=[T(46), T(54), T(62), T(72)], recvRoll=[T(62), T(84)],
             confirm=T(100), steps=[T(110), T(135), T(160), T(185)], toList=[T(198), T(222)], balRoll=[T(198), T(228)])
    for a, b in (p["roll"], p["recvRoll"]):
        events += [dict(sfx="tick", at=f) for f in range(a, b, 3)]
    events += [dict(sfx="press", at=p["confirm"])]
    events += [dict(sfx="step", at=f) for f in p["steps"][:-1]] + [dict(sfx="land", at=p["steps"][-1])]
auto = dict(at=AUTO, weekly=AUTO + 40, turnOn=AUTO + 76, caption="Or set it once, and settled payments pay out on schedule.")
events += [dict(sfx="press", at=auto["weekly"]), dict(sfx="press", at=auto["turnOn"]), dict(sfx="land", at=auto["turnOn"] + 6)]

edit = dict(
    _note="Bachs Global Payouts. 30 fps. Music is Mixkit 148 'Forest Mist Whispers' (Alejandro Magaña), unedited from 24 s, so its lift at 53 s lands on the end card at 29 s. Light mode: soft ticks while figures roll, a press on each button, a small step per tracker stage, one landing tone when a payout completes.",
    fps=FPS, total=TOTAL, endAt=END,
    music=dict(id=148, start=24.0, fade=1.5, lufs=-20),
    sfx=dict(tick=dict(id=2577, peak=-34), press=dict(id=1120, peak=-22), step=dict(id=2573, peak=-30), land=dict(id=1107, peak=-25)),
    payouts=PAYOUTS, auto=auto, events=events,
)
(ROOT / "src/payouts/edit.json").write_text(json.dumps(edit, indent=1, ensure_ascii=False))
for p in PAYOUTS:
    print(p["at"], p["confirm"], p["steps"], p["toList"])
