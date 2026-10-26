import React from 'react';
import { AbsoluteFill, Audio, Img, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { Grain } from '../components';
import { camAt, ClipPointer, smooth, type Seg } from '../doit/DoIt';
import { clamp, ease } from '../motion';
import { fontFaceCss, fonts } from '../theme';
import edit from './edit.json';

// "Build it with Bachs": the same look as "Do it with Bachs" at a calmer pace.
// Each section opens on a bar line with a big headline, which then rises into a
// title while the real product eases in underneath; clips inside a section
// cross-fade while the card resizes, and sections hand over with a blur fade.

const FPS = edit.fps;
export const BUILDWITH_TOTAL = edit.total;

const c = {
  bg: '#09090b',
  fg: '#f4f4f6',
  accent: '#7a87ff',
  muted: '#8b8c99',
};

const XFADE = 12; // frames two clips overlap inside a card
const RESIZE = 16; // frames the card takes to change size
const EXIT = 16; // frames a section takes to fade out

type ClipSeg = Seg & { layout: number[]; card: number[]; cam: number[][]; pointer?: boolean };

const p01 = (f: number, a: number, b: number) => smooth(interpolate(f, [a, b], [0, 1], clamp));

// Two-part headline: each part slides up out of a mask, the second in the accent colour.
const Title: React.FC<{ words: string[]; at: number; size: number }> = ({ words, at, size }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ display: 'flex', columnGap: '0.24em', fontFamily: fonts.sans, fontWeight: 600, fontSize: size, letterSpacing: '-0.05em', lineHeight: 1.1, whiteSpace: 'nowrap' }}>
      {words.map((w, i) => {
        const t = p01(frame, at + i * 5, at + i * 5 + 13);
        return (
          <span key={i} style={{ display: 'inline-block', overflow: 'hidden', paddingBottom: '0.08em' }}>
            <span style={{ display: 'inline-block', color: i === 0 ? c.fg : c.accent, transform: `translateY(${(1 - t) * 105}%)`, opacity: 0.3 + t * 0.7 }}>{w}</span>
          </span>
        );
      })}
    </div>
  );
};

const Pop: React.FC<{ at: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ at, children, style }) => {
  const frame = useCurrentFrame();
  const t = ease(frame, [at, at + 10], [0, 1]);
  return <span style={{ display: 'inline-block', opacity: t, filter: `blur(${(1 - t) * 6}px)`, transform: `translateY(${(1 - t) * 12}px)`, ...style }}>{children}</span>;
};

const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { title, chips, out } = edit.intro;
  const first = chips[0][0] as number;
  const lift = p01(frame, first - 6, first + 14);
  const gone = p01(frame, out, 180);
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: 1 - gone, filter: `blur(${gone * 10}px)` }}>
      <div style={{ transform: `translateY(${-lift * 50}px)` }}>
        <Title words={title} at={6} size={130} />
      </div>
      <div style={{ position: 'absolute', top: 600, display: 'flex', gap: 22, alignItems: 'center', fontFamily: fonts.mono, fontSize: 34, color: c.fg }}>
        {chips.map(([at, label], i) => (
          <React.Fragment key={label}>
            {i > 0 && <Pop at={at as number} style={{ color: c.muted }}>·</Pop>}
            <Pop at={at as number}>{label}</Pop>
          </React.Fragment>
        ))}
      </div>
    </AbsoluteFill>
  );
};

// One clip inside the card, at its own card size, centred in the (possibly resizing) card.
const Layer: React.FC<{ seg: ClipSeg; from: number; boxW: number; boxH: number; fadeIn: boolean; fadeOut: boolean }> = ({ seg, from, boxW, boxH, fadeIn, fadeOut }) => {
  const frame = useCurrentFrame(); // clip frame
  const f = frame - from;
  const [lw, lh] = seg.layout;
  const [cw, ch] = seg.card;
  const [, z, x, y] = camAt(seg.cam, f);
  const s = (cw / lw) * z;
  const tx = Math.min(0, Math.max(cw - lw * s, cw / 2 - x * s));
  const ty = Math.min(0, Math.max(ch - lh * s, ch / 2 - y * s));
  const t = seg.video ? (seg.start ?? 0) + (f / FPS) * (seg.rate ?? 1) : null;
  // The outgoing clip blurs away first and the incoming one blurs in just after, so text never stacks on text.
  const inK = fadeIn ? ease(f, [4, XFADE], [0, 1]) : 1;
  const outK = fadeOut ? 1 - ease(f, [seg.len, seg.len + 8], [0, 1]) : 1;
  return (
    <div
      style={{
        position: 'absolute',
        left: (boxW - cw) / 2,
        top: (boxH - ch) / 2,
        width: cw,
        height: ch,
        overflow: 'hidden',
        opacity: inK * outK,
        filter: `blur(${(2 - inK - outK) * 8}px)`,
      }}
    >
      <div style={{ position: 'absolute', left: 0, top: 0, width: lw, height: lh, transformOrigin: '0 0', transform: `translate(${tx}px, ${ty}px) scale(${s})` }}>
        <Sequence from={from} layout="none">
          {seg.video ? (
            <OffthreadVideo src={staticFile(seg.video)} startFrom={Math.round((seg.start ?? 0) * FPS)} playbackRate={seg.rate ?? 1} muted style={{ width: lw, height: lh }} />
          ) : (
            <Img src={staticFile(seg.image!)} style={{ width: lw, height: lh }} />
          )}
        </Sequence>
      </div>
      {seg.pointer && t !== null && <ClipPointer t={t} rate={seg.rate ?? 1} s={s} tx={tx} ty={ty} />}
    </div>
  );
};

const Card: React.FC<{ segs: ClipSeg[] }> = ({ segs }) => {
  const frame = useCurrentFrame(); // 0 when the clip starts
  const starts = segs.map((_, i) => segs.slice(0, i).reduce((a, g) => a + g.len, 0));
  let i = starts.filter((s) => frame >= s).length - 1;
  i = Math.max(0, i);
  const k = i === 0 ? 1 : p01(frame, starts[i], starts[i] + RESIZE);
  const [w0, h0] = segs[Math.max(0, i - 1)].card;
  const [w1, h1] = segs[i].card;
  const w = w0 + (w1 - w0) * k;
  const h = h0 + (h1 - h0) * k;
  return (
    <div style={{ position: 'relative', width: w, height: h, borderRadius: 20, overflow: 'hidden', background: '#fff', boxShadow: '0 50px 120px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.10)' }}>
      {segs.map((g, j) => {
        const end = starts[j] + g.len + (j < segs.length - 1 ? XFADE : 0);
        if (frame < starts[j] || frame >= end) return null;
        return <Layer key={j} seg={g} from={starts[j]} boxW={w} boxH={h} fadeIn={j > 0} fadeOut={j < segs.length - 1} />;
      })}
    </div>
  );
};

type Section = (typeof edit.sections)[number];

const SectionView: React.FC<{ sec: Section }> = ({ sec }) => {
  const frame = useCurrentFrame();
  const l = frame - sec.from;
  const rise = p01(l, 30, 60); // headline moves up into a title
  const cardIn = p01(l, 34, 64);
  const exit = p01(l, sec.len - EXIT, sec.len);
  const chips = 'chips' in sec ? sec.chips : undefined;
  return (
    <AbsoluteFill style={{ opacity: 1 - exit, filter: `blur(${exit * 10}px)`, transform: `translateY(${-exit * 24}px)` }}>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ transform: `translateY(${-rise * 420}px) scale(${1 - rise * 0.6})` }}>
          <Title words={sec.headline} at={sec.from} size={150} />
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', paddingTop: chips ? 40 : 90 }}>
        <div style={{ opacity: cardIn, filter: `blur(${(1 - cardIn) * 12}px)`, transform: `translateY(${(1 - cardIn) * 90}px) scale(${0.97 + cardIn * 0.03})` }}>
          <Sequence from={sec.clipAt} layout="none">
            <Card segs={sec.clip.segs as ClipSeg[]} />
          </Sequence>
        </div>
      </AbsoluteFill>
      {chips && (
        <div style={{ position: 'absolute', left: 0, right: 0, top: 968, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, fontFamily: fonts.sans, fontSize: 30 }}>
          <Pop at={chips.at - 10} style={{ color: c.muted, marginRight: 8 }}>{chips.label}</Pop>
          {chips.names.map((n, i) => (
            <Pop key={n} at={chips.at + i * 8} style={{ color: c.fg, padding: '10px 22px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.05)' }}>
              {n}
            </Pop>
          ))}
        </div>
      )}
    </AbsoluteFill>
  );
};

const EndLine: React.FC = () => {
  const frame = useCurrentFrame();
  const { from, to, headline } = edit.endLine;
  const out = p01(frame, to - 10, to);
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: 1 - out, filter: `blur(${out * 8}px)` }}>
      <Title words={headline} at={from} size={150} />
    </AbsoluteFill>
  );
};

const Logo: React.FC = () => {
  const frame = useCurrentFrame();
  const { from, url } = edit.logo;
  const hit = p01(frame, from, from + 14);
  const urlIn = ease(frame, [from + 14, from + 28], [0, 1]);
  const out = ease(frame, [BUILDWITH_TOTAL - 16, BUILDWITH_TOTAL], [0, 1]);
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: 1 - out }}>
      <Img src={staticFile('brand/logo-white.png')} style={{ height: 92, transform: `scale(${0.92 + hit * 0.08})`, opacity: hit, filter: `blur(${(1 - hit) * 8}px)` }} />
      <div style={{ marginTop: 34, fontFamily: fonts.mono, fontSize: 30, letterSpacing: '0.04em', color: c.muted, opacity: urlIn, transform: `translateY(${(1 - urlIn) * 10}px)` }}>{url}</div>
    </AbsoluteFill>
  );
};

export const BuildWith: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: c.bg }}>
      <style>{fontFaceCss}</style>
      {frame < 180 && <Intro />}
      {edit.sections.map((sec) => (frame >= sec.from && frame < sec.from + sec.len ? <SectionView key={sec.id} sec={sec} /> : null))}
      {frame >= edit.endLine.from && frame < edit.endLine.to && <EndLine />}
      {frame >= edit.logo.from && <Logo />}
      <Grain />
      <Audio src={staticFile('audio/buildwith-mix.wav')} />
    </AbsoluteFill>
  );
};
