import React from 'react';
import { AbsoluteFill, Audio, Img, interpolate, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame } from 'remotion';
import { Words } from '../components';
import { clamp, ease } from '../motion';
import { fontFaceCss, fonts } from '../theme';
import data from './buy-credits-events.json';
import edit from './buy-credits-edit.json';

// "Bachs in action" #1: a real purchase on the SnapKit demo store, recorded with
// recorder/record-web.mjs. Camera moves and the cursor come from the logged
// events and pointer path (page coordinates, 1600x900).

const FPS = 30;
const PW = 1600;
const PH = 900;
const ev = Object.fromEntries(data.events.map((e) => [e.name, e.t])) as Record<string, number>;
const CUT = edit.cut; // seconds of recording used: ends while SnapKit's toast is showing
const END_CARD = 2.6;

// Holds pause the recording on a still frame (see buy-credits-edit.json).
// shift(): recording time -> playback time. rec(): playback time -> recording time.
const holds = edit.holds;
const shift = (t: number) => holds.reduce((acc, h) => acc + (t > h.at ? h.len : 0), t);
const rec = (p: number) => {
  let t = p;
  for (const h of holds) {
    const start = shift(h.at);
    if (p >= start && p < start + h.len) return h.at;
    if (p >= start + h.len) t -= h.len;
  }
  return t;
};
const holdAt = (p: number) => holds.find((h) => p >= shift(h.at) && p < shift(h.at) + h.len);
const PLAY_END = shift(CUT);
export const BUY_CREDITS_TOTAL = Math.round((PLAY_END + END_CARD) * FPS);

const ink = '#141412';
const paper = '#f2f1ec';
const muted = '#6b6a64';

// Window: the recording at 0.93x of its 1600x900 layout, under a browser bar.
const SCALE = 0.93;
const VW = PW * SCALE;
const VH = PH * SCALE;
const BAR = 46;

type Key = { t: number; z: number; x: number; y: number };
const H1 = shift(holds[0].at); // success hold starts (playback s)
const H2 = shift(holds[1].at); // toast hold starts
const keys: Key[] = [
  { t: 0, z: 1, x: 800, y: 450 },
  { t: ev.pricing - 0.2, z: 1, x: 800, y: 450 },
  { t: ev.buy - 0.15, z: 1.35, x: 520, y: 560 },
  { t: ev.buy + 0.45, z: 1.35, x: 520, y: 560 },
  { t: ev.buy + 1.0, z: 1.4, x: 800, y: 470 },
  { t: ev.guest + 0.3, z: 1.4, x: 800, y: 470 },
  { t: ev.checkout - 0.6, z: 1, x: 800, y: 450 },
  { t: ev.paynow - 0.9, z: 1, x: 800, y: 450 },
  { t: ev.paynow - 0.1, z: 1.3, x: 1040, y: 400 },
  { t: ev.card + 0.6, z: 1.6, x: 1060, y: 470 },
  { t: ev['card-done'] + 0.4, z: 1.6, x: 1060, y: 470 },
  { t: ev.pay - 0.1, z: 1.45, x: 1060, y: 580 },
  { t: H1 - 0.15, z: 1.45, x: 1000, y: 520 },
  { t: H1 + 0.5, z: 1.55, x: 800, y: 300 },
  { t: H1 + holds[0].len, z: 1.55, x: 800, y: 300 },
  { t: H2 - 0.05, z: 1.1, x: 800, y: 600 },
  { t: H2 + 0.7, z: 1.5, x: 800, y: 820 },
  { t: PLAY_END, z: 1.5, x: 800, y: 820 },
];
const smooth = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const camera = (t: number) => {
  let i = 0;
  while (i < keys.length - 2 && t >= keys[i + 1].t) i++;
  const a = keys[i];
  const b = keys[i + 1];
  const k = smooth(ease(t, [a.t, b.t], [0, 1], (x) => x));
  return { z: a.z + (b.z - a.z) * k, x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
};
// Camera transform for the recording inside the window (page px -> window px).
const view = (t: number) => {
  const { z, x, y } = camera(t);
  const s = SCALE * z;
  const tx = Math.min(0, Math.max(VW - PW * s, VW / 2 - x * s));
  const ty = Math.min(0, Math.max(VH - PH * s, VH / 2 - y * s));
  return { s, tx, ty };
};

// Pointer path: each logged move was eased in the recording, so ease between samples.
const pointerAt = (t: number) => {
  const p = data.pointer;
  if (t <= p[0].t) return p[0];
  for (let i = 0; i < p.length - 1; i++) {
    if (t >= p[i].t && t <= p[i + 1].t) {
      const span = p[i + 1].t - p[i].t;
      const k = span <= 0 ? 1 : smooth((t - p[i].t) / span);
      return { x: p[i].x + (p[i + 1].x - p[i].x) * k, y: p[i].y + (p[i + 1].y - p[i].y) * k };
    }
  }
  return p[p.length - 1];
};
const clicks = data.pointer.filter((p) => 'click' in p && p.click);

const Pointer: React.FC<{ p: number }> = ({ p: play }) => {
  const { s, tx, ty } = view(play);
  const t = rec(play);
  const p = pointerAt(t);
  const x = tx + p.x * s;
  const y = ty + p.y * s;
  const press = clicks.reduce((m, c) => Math.max(m, interpolate(t, [c.t - 0.02, c.t + 0.06, c.t + 0.22], [0, 1, 0], clamp)), 0);
  return (
    <>
      {clicks.map((c) => {
        const k = interpolate(t, [c.t, c.t + 0.5], [0, 1], clamp);
        if (k <= 0 || k >= 1) return null;
        return (
          <div
            key={c.t}
            style={{
              position: 'absolute',
              left: tx + c.x * s - 28 * k,
              top: ty + c.y * s - 28 * k,
              width: 56 * k,
              height: 56 * k,
              borderRadius: '50%',
              border: `2.5px solid rgba(20,20,18,${0.45 * (1 - k)})`,
              background: `rgba(20,20,18,${0.08 * (1 - k)})`,
            }}
          />
        );
      })}
      <svg
        width="30"
        height="36"
        viewBox="0 0 17 20"
        style={{ position: 'absolute', left: x - 3, top: y - 2, transform: `scale(${1 - press * 0.15})`, transformOrigin: '3px 2px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
      >
        <path d="M1.5 1.5 L1.5 16 L5.3 12.4 L8 18.5 L10.6 17.4 L8 11.4 L13.2 11.4 Z" fill="#111" stroke="#fff" strokeWidth="1.3" strokeLinejoin="round" />
      </svg>
    </>
  );
};

const Caption: React.FC<{ t: number; from: number; to: number; text: string }> = ({ t, from, to, text }) => {
  const inT = spring({ frame: Math.round((t - from) * FPS), fps: FPS, config: { damping: 18 } });
  const out = ease(t, [to - 0.25, to], [0, 1]);
  if (t < from || t > to) return null;
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 34, display: 'flex', justifyContent: 'center', zIndex: 5 }}>
      <div
        style={{
          padding: '14px 26px',
          borderRadius: 999,
          background: 'rgba(20,20,18,0.88)',
          color: '#f6f5f0',
          fontFamily: fonts.sans,
          fontWeight: 500,
          fontSize: 28,
          letterSpacing: '-0.01em',
          boxShadow: '0 12px 30px rgba(0,0,0,0.18)',
          opacity: Math.min(1, inT * 1.5) * (1 - out),
          transform: `translateY(${(1 - inT) * 18}px)`,
        }}
      >
        {text}
      </div>
    </div>
  );
};

const Recording: React.FC = () => {
  const frame = useCurrentFrame();
  const p = frame / FPS;
  const { s, tx, ty } = view(p);
  const hold = holdAt(p);
  // Video segments: each starts where the recording resumes after the previous hold.
  const segs = [{ from: 0, start: 0 }, ...holds.map((h) => ({ from: shift(h.at) + h.len, start: h.at }))];
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: PW, height: PH, transformOrigin: '0 0', transform: `translate(${tx}px, ${ty}px) scale(${s})` }}>
      {hold ? (
        <Img src={staticFile(hold.image)} style={{ width: PW, height: PH }} />
      ) : (
        segs.map((g, i) => {
          const until = i < holds.length ? shift(holds[i].at) : PLAY_END + END_CARD;
          return (
            <Sequence key={i} from={Math.round(g.from * FPS)} durationInFrames={Math.max(1, Math.round((until - g.from) * FPS))} layout="none">
              <OffthreadVideo src={staticFile('inaction/buy-credits.mp4')} startFrom={Math.round(g.start * FPS)} style={{ width: PW, height: PH }} />
            </Sequence>
          );
        })
      )}
    </div>
  );
};

const Window: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  return (
    <div style={{ position: 'relative', width: VW, height: VH + BAR, borderRadius: 16, overflow: 'hidden', background: '#fff', boxShadow: '0 40px 100px rgba(40,36,20,0.20), 0 8px 24px rgba(40,36,20,0.10), 0 0 0 1px rgba(20,20,18,0.08)' }}>
      <div style={{ height: BAR, background: '#e9e7e0', display: 'flex', alignItems: 'center', padding: '0 18px', gap: 8, borderBottom: '1px solid rgba(20,20,18,0.08)' }}>
        {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
          <div key={c} style={{ width: 12, height: 12, borderRadius: 6, background: c }} />
        ))}
        <div style={{ margin: '0 auto', transform: 'translateX(-30px)', width: 520, height: 28, borderRadius: 8, background: '#f6f5f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fonts.sans, fontSize: 15, color: '#3a3934' }}>
          🔒&nbsp;snapkit.bachs.io
        </div>
      </div>
      <div style={{ position: 'relative', width: VW, height: VH, overflow: 'hidden' }}>
        <Recording />
        <Pointer p={t} />
      </div>
    </div>
  );
};

const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const a = spring({ frame: frame - 4, fps: FPS, config: { damping: 18 } });
  const b = spring({ frame: frame - 14, fps: FPS, config: { damping: 18 } });
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', background: paper, opacity: ease(frame, [0, 8], [0, 1]) }}>
      <Img src={staticFile('brand/lettermark.svg')} style={{ width: 360, opacity: Math.min(1, a * 1.5), transform: `translateY(${(1 - a) * 20}px)` }} />
      <Words text="Payments built for internet businesses." delay={8} stagger={2} style={{ marginTop: 34, fontFamily: fonts.sans, fontWeight: 560, fontSize: 46, letterSpacing: '-0.03em', color: ink }} />
      <div style={{ marginTop: 26, fontFamily: fonts.mono, fontSize: 26, color: muted, opacity: Math.min(1, b * 1.5) }}>Try it yourself · snapkit.bachs.io</div>
    </AbsoluteFill>
  );
};

export const BuyCredits: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const cutF = Math.round(PLAY_END * FPS);
  return (
    <AbsoluteFill style={{ background: `radial-gradient(120% 100% at 50% 0%, #fbfaf6 0%, ${paper} 55%, #e8e6dd 100%)` }}>
      <style>{fontFaceCss}</style>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', paddingBottom: 40, opacity: 1 - ease(frame, [cutF - 6, cutF + 4], [0, 1]) }}>
        <Window />
      </AbsoluteFill>
      <Caption t={t} from={0.5} to={4.2} text="SnapKit: a demo store running on Bachs" />
      <Caption t={t} from={ev.buy + 0.3} to={ev.checkout + 1.6} text="Checkout opens right on the page" />
      <Caption t={t} from={ev.card + 0.2} to={ev['card-done'] + 0.6} text="A real payment, in the sandbox" />
      <Caption t={t} from={H1 + 0.2} to={PLAY_END - 0.1} text="Paid. Start to finish in under 30 seconds." />
      <Sequence from={cutF - 4}>
        <EndCard />
      </Sequence>
      <Audio src={staticFile('audio/buy-credits-mix.wav')} />
    </AbsoluteFill>
  );
};
