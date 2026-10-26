import React from 'react';
import { AbsoluteFill, Audio, Img, interpolate, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame } from 'remotion';
import { Grain } from '../components';
import { clicks, pointerAt } from '../inaction/BuyCredits';
import { clamp, ease } from '../motion';
import { fontFaceCss, fonts } from '../theme';
import edit from './edit.json';

// "Do it with Bachs": the Whop CLI launch rhythm on Bachs. Small words on black
// build to a ribbon of everything Bachs does, then the drop starts a run of big
// two-word headlines, each answered by a second of the real product.

const FPS = edit.fps;
export const DOIT_TOTAL = edit.total;

const c = {
  bg: '#09090b',
  fg: '#f4f4f6',
  accent: '#7a87ff',
  muted: '#8b8c99',
};

const smooth = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

// ---------- opener ----------

type OpenerItem = { from: number; to: number; text?: string; wordmark?: boolean; accent?: string[]; stagger?: number };

const Pop: React.FC<{ at: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ at, children, style }) => {
  const frame = useCurrentFrame();
  const t = ease(frame, [at, at + 7], [0, 1]);
  return <span style={{ display: 'inline-block', opacity: t, filter: `blur(${(1 - t) * 8}px)`, transform: `translateY(${(1 - t) * 14}px)`, ...style }}>{children}</span>;
};

const OpenerLine: React.FC<{ item: OpenerItem }> = ({ item }) => {
  const words = (item.text ?? '').split(' ');
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      {item.wordmark ? (
        <Pop at={item.from}>
          <Img src={staticFile('brand/logo-white.png')} style={{ height: 40 }} />
        </Pop>
      ) : (
        <div style={{ display: 'flex', columnGap: '0.28em', fontFamily: fonts.sans, fontWeight: 500, fontSize: 58, letterSpacing: '-0.03em', color: c.fg }}>
          {words.map((w, i) => (
            <Pop key={i} at={item.from + i * (item.stagger ?? 0)} style={{ color: item.accent?.includes(w) ? c.accent : undefined }}>
              {w}
            </Pop>
          ))}
        </div>
      )}
    </AbsoluteFill>
  );
};

// ---------- ribbon: a drum of everything Bachs does, spinning up into the drop ----------

const RIBBON = ['products', 'checkout', 'subscriptions', 'customer portal', 'payouts', 'balances', 'webhooks', '135+ currencies', 'crypto', 'refunds', 'Node.js', 'Python', 'MCP', 'skills'];

const Ribbon: React.FC<{ from: number; to: number }> = ({ from, to }) => {
  const frame = useCurrentFrame();
  const t = (frame - from) / (to - from);
  // Accelerates with the riser: angle grows with t squared.
  const spin = 20 + t * 90 + t * t * 230;
  const words = [...RIBBON, ...RIBBON];
  const step = 360 / words.length;
  const radius = 560;
  const inT = ease(frame, [from, from + 6], [0, 1]);
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', perspective: 1600, opacity: inT }}>
      <div style={{ position: 'relative', width: 0, height: 0, transformStyle: 'preserve-3d', transform: `rotateZ(-10deg) rotateY(${-26 + t * 12}deg) rotateX(${-spin}deg)` }}>
        {words.map((w, i) => {
          const facing = Math.cos(((i * step - spin) * Math.PI) / 180); // 1 = facing us
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                transform: `translate(-50%, -50%) rotateX(${i * step}deg) translateZ(${radius}px)`,
                whiteSpace: 'nowrap',
                fontFamily: fonts.sans,
                fontWeight: 800,
                fontSize: 96,
                letterSpacing: '-0.045em',
                color: c.fg,
                opacity: interpolate(facing, [0.05, 0.55, 1], [0, 0.4, 1], clamp),
              }}
            >
              {w}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ---------- headlines ----------

const Headline: React.FC<{ from: number; words: string[]; size: number }> = ({ from, words, size }) => {
  const frame = useCurrentFrame();
  const drift = interpolate(frame, [from, from + 30], [1.035, 1], clamp);
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', columnGap: '0.24em', fontFamily: fonts.sans, fontWeight: 600, fontSize: size, letterSpacing: '-0.055em', lineHeight: 1.1, transform: `scale(${drift})` }}>
        {words.map((w, i) => {
          const t = smooth(interpolate(frame, [from + i * 3, from + i * 3 + 8], [0, 1], clamp));
          return (
            <span key={i} style={{ display: 'inline-block', overflow: 'hidden', paddingBottom: '0.08em' }}>
              <span style={{ display: 'inline-block', color: i === 0 ? c.fg : c.accent, transform: `translateY(${(1 - t) * 105}%)` }}>{w}</span>
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ---------- clips: the real product, framed and moved ----------

type Seg = { len: number; video?: string; image?: string; start?: number; rate?: number };
type Clip = { layout: number[]; card?: number[]; pointer?: boolean; segs: Seg[]; cam: number[][] };

const camAt = (cam: number[][], f: number) => {
  if (f <= cam[0][0]) return cam[0];
  for (let i = 0; i < cam.length - 1; i++) {
    const [f0, ...a] = cam[i];
    const [f1, ...b] = cam[i + 1];
    if (f >= f0 && f <= f1) {
      const k = smooth((f - f0) / (f1 - f0));
      return [f, ...a.map((v, j) => v + (b[j] - v) * k)];
    }
  }
  return cam[cam.length - 1];
};

// Which segment a clip frame is in, and the source time there (null on a still image).
const segAt = (segs: Seg[], f: number) => {
  let start = 0;
  for (const s of segs) {
    if (f < start + s.len) return { seg: s, start, t: s.video ? (s.start ?? 0) + ((f - start) / FPS) * (s.rate ?? 1) : null };
    start += s.len;
  }
  return { seg: segs[segs.length - 1], start: start - segs[segs.length - 1].len, t: null };
};

const ClipPointer: React.FC<{ t: number; rate: number; s: number; tx: number; ty: number }> = ({ t, rate, s, tx, ty }) => {
  const p = pointerAt(t);
  const press = clicks.reduce((m, k) => Math.max(m, interpolate(t, [k.t - 0.02 * rate, k.t + 0.06 * rate, k.t + 0.22 * rate], [0, 1, 0], clamp)), 0);
  return (
    <>
      {clicks.map((k) => {
        const r = interpolate(t, [k.t, k.t + 0.45 * rate], [0, 1], clamp);
        if (r <= 0 || r >= 1) return null;
        return (
          <div
            key={k.t}
            style={{
              position: 'absolute',
              left: tx + k.x * s - 30 * r,
              top: ty + k.y * s - 30 * r,
              width: 60 * r,
              height: 60 * r,
              borderRadius: '50%',
              border: `2.5px solid rgba(20,20,18,${0.5 * (1 - r)})`,
              background: `rgba(20,20,18,${0.08 * (1 - r)})`,
            }}
          />
        );
      })}
      <svg
        width="34"
        height="40"
        viewBox="0 0 17 20"
        style={{ position: 'absolute', left: tx + p.x * s - 3, top: ty + p.y * s - 2, transform: `scale(${1 - press * 0.15})`, transformOrigin: '3px 2px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
      >
        <path d="M1.5 1.5 L1.5 16 L5.3 12.4 L8 18.5 L10.6 17.4 L8 11.4 L13.2 11.4 Z" fill="#111" stroke="#fff" strokeWidth="1.3" strokeLinejoin="round" />
      </svg>
    </>
  );
};

const ClipCard: React.FC<{ clip: Clip; len: number }> = ({ clip, len }) => {
  const frame = useCurrentFrame(); // 0 at the cut to this clip
  const [lw, lh] = clip.layout;
  const [CW, CH] = clip.card ?? [1520, 855];
  const [, z, x, y] = camAt(clip.cam, frame);
  const s = (CW / lw) * z;
  const tx = Math.min(0, Math.max(CW - lw * s, CW / 2 - x * s));
  const ty = Math.min(0, Math.max(CH - lh * s, CH / 2 - y * s));
  const pop = spring({ frame, fps: FPS, config: { damping: 22, stiffness: 260, mass: 0.6 } });
  const here = segAt(clip.segs, frame);
  let segStart = 0;
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div
        style={{
          position: 'relative',
          width: CW,
          height: CH,
          borderRadius: 20,
          overflow: 'hidden',
          background: '#fff',
          boxShadow: '0 50px 120px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.10)',
          transform: `scale(${0.94 + pop * 0.06})`,
          filter: `blur(${(1 - Math.min(1, pop)) * 6}px)`,
        }}
      >
        <div style={{ position: 'absolute', left: 0, top: 0, width: lw, height: lh, transformOrigin: '0 0', transform: `translate(${tx}px, ${ty}px) scale(${s})` }}>
          {clip.segs.map((g, i) => {
            const from = segStart;
            segStart += g.len;
            return (
              <Sequence key={i} from={from} durationInFrames={i === clip.segs.length - 1 ? Math.max(g.len, len - from) : g.len} layout="none">
                {g.video ? (
                  <OffthreadVideo src={staticFile(g.video)} startFrom={Math.round((g.start ?? 0) * FPS)} playbackRate={g.rate ?? 1} muted style={{ width: lw, height: lh }} />
                ) : (
                  <Img src={staticFile(g.image!)} style={{ width: lw, height: lh }} />
                )}
              </Sequence>
            );
          })}
        </div>
        {clip.pointer && here.t !== null && <ClipPointer t={here.t} rate={here.seg.rate ?? 1} s={s} tx={tx} ty={ty} />}
      </div>
    </AbsoluteFill>
  );
};

// ---------- end ----------

const Logo: React.FC<{ from: number; url: string }> = ({ from, url }) => {
  const frame = useCurrentFrame();
  const hit = spring({ frame: frame - from, fps: FPS, config: { damping: 16, stiffness: 180 } });
  const urlIn = ease(frame, [from + 14, from + 26], [0, 1]);
  const out = ease(frame, [DOIT_TOTAL - 14, DOIT_TOTAL], [0, 1]);
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: 1 - out }}>
      <Img src={staticFile('brand/logo-white.png')} style={{ height: 92, transform: `scale(${0.9 + hit * 0.1})`, opacity: Math.min(1, hit * 1.6) }} />
      <div style={{ marginTop: 34, fontFamily: fonts.mono, fontSize: 30, letterSpacing: '0.04em', color: c.muted, opacity: urlIn, transform: `translateY(${(1 - urlIn) * 10}px)` }}>{url}</div>
    </AbsoluteFill>
  );
};

export const DoIt: React.FC = () => {
  const frame = useCurrentFrame();
  const opener = edit.opener as OpenerItem[];
  const now = <T extends { from: number; to: number }>(x: T) => frame >= x.from && frame < x.to;
  return (
    <AbsoluteFill style={{ background: c.bg }}>
      <style>{fontFaceCss}</style>
      {opener.filter(now).map((o) => (
        <OpenerLine key={o.from} item={o} />
      ))}
      {now(edit.ribbon) && <Ribbon from={edit.ribbon.from} to={edit.ribbon.to} />}
      {edit.slots.map((sl) => (
        <React.Fragment key={sl.id}>
          {frame >= sl.from && frame < sl.clipAt && <Headline from={sl.from} words={sl.headline} size={sl.size} />}
          <Sequence from={sl.clipAt} durationInFrames={sl.to - sl.clipAt}>
            <ClipCard clip={sl.clip as Clip} len={sl.to - sl.clipAt} />
          </Sequence>
        </React.Fragment>
      ))}
      {now(edit.endLine) && <Headline from={edit.endLine.from} words={edit.endLine.headline} size={edit.endLine.size} />}
      {frame >= edit.logo.from && <Logo from={edit.logo.from} url={edit.logo.url} />}
      <Grain />
      <Audio src={staticFile('audio/doit-mix.wav')} />
    </AbsoluteFill>
  );
};
