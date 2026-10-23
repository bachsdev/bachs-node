import React from 'react';
import { AbsoluteFill, Freeze, Img, interpolate, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame } from 'remotion';
import { Words } from '../../components';
import { clamp, ease } from '../../motion';
import { bachs, fontFaceCss, fonts } from '../../theme';
import { blockView, browserMoves, editorMoves, recapMoves, viewAt, type Move, type View } from './camera';
import { FPS, place, srcTime, type Card, type Chapter, type Placed, type PlacedTake, type TakeData } from './timeline';

// "Build it with Bachs" episode 01, in the style of ../Sample.tsx: real 4K
// screen recordings framed as windows on the brand background, eased camera
// moves driven by the recorded events, chapter cards and numbered steps.
// Narration shows as subtitles until the voice is recorded.

export type Cut = { lang: 'node' | 'python'; label: string; chapters: Chapter[]; takes: Record<string, TakeData> };

const EDITOR = { w: 1600, h: 900 };
const BAR = 52; // browser chrome
const BROWSER = { w: Math.round(((EDITOR.h - BAR) * 16) / 9), h: EDITOR.h };
const TOP = 62; // leaves room for subtitles below the window

// ------------------------------------------------------------------ recording

// A recap beat frames its highlighted block, easing in from the block before.
const highlightView = (take: TakeData, hl: PlacedTake['hl']): View | null => {
  if (!hl) return null;
  const ev = take.events.find((e) => e.name === hl.at) as { lines?: Record<string, [number, number]>; left?: number } | undefined;
  return ev?.lines ? blockView(ev.lines, ev.left ?? 400, hl.from, hl.to) : null;
};

const Recording: React.FC<{ cut: Cut; b: PlacedTake; prev?: Placed; moves: Move[]; w: number; h: number }> = ({ cut, b, prev, moves, w, h }) => {
  const local = useCurrentFrame();
  const take = cut.takes[b.take];
  const t = srcTime(b, local);
  let { z, x, y } = viewAt(moves, t);
  const hv = highlightView(take, b.hl);
  if (hv) {
    const pv = (prev && 'take' in prev && prev.take === b.take && highlightView(take, prev.hl)) || { z, x, y };
    const k = ease(local, [0, 18], [0, 1]);
    [z, x, y] = [pv.z + (hv.z - pv.z) * k, pv.x + (hv.x - pv.x) * k, pv.y + (hv.y - pv.y) * k];
  }
  const s = (w / 1920) * z;
  const tx = Math.min(0, Math.max(w - 1920 * s, w / 2 - x * s));
  const ty = Math.min(0, Math.max(h - 1080 * s, h / 2 - y * s));
  const startFrom = Math.round(b.src0 * FPS);
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, transformOrigin: '0 0', transform: `translate(${tx}px, ${ty}px) scale(${s})` }}>
      <Freeze frame={Math.min(local, b.segFrames - 1)}>
        <OffthreadVideo
          src={staticFile(`tutorial/ep01-${cut.lang}-${b.take}-${b.win}.mp4`)}
          startFrom={startFrom}
          playbackRate={b.speed ?? 1}
          muted
          style={{ width: 1920, height: 1080 }}
        />
      </Freeze>
      {b.win === 'editor' && <Masks take={take} t={t} />}
      {b.win === 'editor' && b.hl && <Spotlight take={take} hl={b.hl} local={local} />}
      {b.win === 'browser' && <Pointer take={take} t={t} />}
    </div>
  );
};

// Secrets: the recorder already boxed them in the page; this marks the box as
// deliberately masked. Shown from just before the text appears.
const Masks: React.FC<{ take: TakeData; t: number }> = ({ take, t }) => {
  const live = [...take.masks].reverse().find((m) => m.t <= t + 0.1);
  if (!live) return null;
  return (
    <>
      {live.rects.map(([x, y, w, h], i) => (
        <div
          key={i}
          style={{
            position: 'absolute', left: x - 2, top: y + 1, width: w + 4, height: h - 2, borderRadius: 4,
            background: '#e6e7ee', overflow: 'hidden', display: 'flex', alignItems: 'center', paddingLeft: 6,
            fontFamily: fonts.mono, fontSize: 13, letterSpacing: '0.18em', color: '#8a8d9e', whiteSpace: 'nowrap',
          }}
        >
          {'•'.repeat(Math.max(4, Math.floor(w / 9)))}
        </div>
      ))}
    </>
  );
};

// Recap: dim everything but a range of lines, using line positions the recorder logged.
const Spotlight: React.FC<{ take: TakeData; hl: { at: string; from: number; to: number }; local: number }> = ({ take, hl, local }) => {
  const ev = take.events.find((e) => e.name === hl.at) as { lines?: Record<string, [number, number]> } | undefined;
  const lines = ev?.lines ?? {};
  const a = lines[String(hl.from)];
  const b = lines[String(hl.to)];
  if (!a || !b) return null;
  const top = a[0] - 4;
  const bottom = b[0] + b[1] + 4;
  const o = ease(local, [0, 12], [0, 1]);
  const shade = `rgba(255,255,255,${0.72 * o})`;
  return (
    <>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: top, background: shade }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: bottom, bottom: 0, background: shade }} />
      <div style={{ position: 'absolute', left: 300, width: 6, top, height: bottom - top, background: bachs.indigo, opacity: o, borderRadius: 3 }} />
    </>
  );
};

// The pointer replays the recorded mouse path; it dips and rings on a click.
const Pointer: React.FC<{ take: TakeData; t: number }> = ({ take, t }) => {
  const keys = take.events.filter((e) => e.name === 'mouse' || e.name === 'click') as unknown as { t: number; x: number; y: number; name: string }[];
  if (!keys.length || t < keys[0].t - 0.2) return null;
  let x = keys[0].x;
  let y = keys[0].y;
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (t >= a.t && t <= b.t) {
      const k = b.t > a.t ? (t - a.t) / (b.t - a.t) : 1;
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      x = a.x + (b.x - a.x) * e;
      y = a.y + (b.y - a.y) * e;
    } else if (t > b.t) {
      x = b.x;
      y = b.y;
    }
  }
  const clicks = keys.filter((k) => k.name === 'click');
  const dip = clicks.reduce((m, c) => Math.max(m, interpolate(t, [c.t, c.t + 0.12, c.t + 0.4], [0, 1, 0], clamp)), 0);
  const rings = clicks.map((c) => ({ c, k: (t - c.t) / 0.6 })).filter(({ k }) => k > 0 && k < 1);
  return (
    <>
      {rings.map(({ c, k }) => (
        <div key={c.t} style={{ position: 'absolute', left: c.x - 26 * k, top: c.y - 26 * k, width: 52 * k, height: 52 * k, borderRadius: '50%', border: `2px solid rgba(82,102,235,${0.65 * (1 - k)})` }} />
      ))}
      <svg width="26" height="30" viewBox="0 0 17 20" style={{ position: 'absolute', left: x - 2, top: y - 1, transform: `scale(${1 - dip * 0.14})`, transformOrigin: '2px 1px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>
        <path d="M1.5 1.5 L1.5 16 L5.3 12.4 L8 18.5 L10.6 17.4 L8 11.4 L13.2 11.4 Z" fill="#111" stroke="#fff" strokeWidth="1.3" strokeLinejoin="round" />
      </svg>
    </>
  );
};

const urlAt = (take: TakeData, t: number) => {
  // A navigation is reported a moment after the page paints, so switch early.
  const u = [...take.events].reverse().find((e) => e.name === 'url' && e.t <= t + 0.2) as { url?: string } | undefined;
  if (!u?.url) return 'localhost:3000';
  const url = new URL(u.url);
  return url.host + (url.pathname.length > 1 ? (url.pathname.startsWith('/c/') ? '/c/…' : url.pathname) : '');
};

const Window: React.FC<{ cut: Cut; b: PlacedTake; prev?: Placed; enter: boolean }> = ({ cut, b, prev, enter }) => {
  const local = useCurrentFrame();
  const take = cut.takes[b.take];
  const isBrowser = b.win === 'browser';
  const size = isBrowser ? BROWSER : EDITOR;
  const moves = React.useMemo(
    () => (b.take === 'recap' ? recapMoves() : isBrowser ? browserMoves(take) : editorMoves(take)),
    [b.take, isBrowser, take],
  );
  const inT = enter ? spring({ frame: local, fps: FPS, config: { damping: 20, stiffness: 120 } }) : 1;
  const url = isBrowser ? urlAt(take, srcTime(b, local)) : '';
  const contentH = isBrowser ? size.h - BAR : size.h;
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-start', paddingTop: TOP }}>
      <div
        style={{
          position: 'relative', width: size.w, height: size.h, borderRadius: 18, overflow: 'hidden', background: '#fff',
          boxShadow: '0 40px 100px rgba(23,26,60,0.22), 0 8px 24px rgba(23,26,60,0.10), 0 0 0 1px rgba(17,17,17,0.06)',
          opacity: Math.min(1, inT * 1.4), transform: `translateY(${(1 - inT) * 40}px) scale(${0.97 + inT * 0.03})`,
        }}
      >
        {isBrowser && (
          <div style={{ height: BAR, display: 'flex', alignItems: 'center', gap: 9, padding: '0 18px', background: '#eef0f6', borderBottom: '1px solid #e1e4ee' }}>
            {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
              <div key={c} style={{ width: 12, height: 12, borderRadius: 6, background: c }} />
            ))}
            <div style={{ marginLeft: 22, flex: 1, maxWidth: 760, height: 32, borderRadius: 9, background: '#fff', border: '1px solid #e1e4ee', display: 'flex', alignItems: 'center', padding: '0 14px', fontFamily: fonts.sans, fontSize: 16, color: '#3a3b44' }}>
              {url}
            </div>
          </div>
        )}
        <div style={{ position: 'relative', width: size.w, height: contentH, overflow: 'hidden' }}>
          <Recording cut={cut} b={b} prev={prev} moves={moves} w={size.w} h={contentH} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ cards

const ChecklistItems = (lang: Cut['lang']) => [
  ['A Bachs sandbox API key', 'starts with sk_sandbox_'],
  lang === 'node' ? ['Node.js 22 or newer', 'node --version'] : ['Python 3.10 or newer', 'python --version'],
  ['The Bachs CLI', 'npm install -g @bachs/cli'],
];

const CardView: React.FC<{ card: Card; cut: Cut; frames: number }> = ({ card, cut, frames }) => {
  const f = useCurrentFrame();
  const fade = 1 - ease(f, [frames - 8, frames], [0, 1]);
  const center: React.CSSProperties = { alignItems: 'center', justifyContent: 'center', opacity: fade };
  if (card.kind === 'title' || card.kind === 'end') {
    const end = card.kind === 'end';
    return (
      <AbsoluteFill style={center}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, opacity: ease(f, [2, 12], [0, 1]) }}>
          <Img src={staticFile('brand/bachs-logo.svg')} style={{ width: 44, height: 44 }} />
          <span style={{ fontFamily: fonts.mono, fontSize: 22, letterSpacing: '0.24em', color: bachs.muted }}>{end ? 'NEXT IN BUILD IT WITH BACHS' : 'BUILD IT WITH BACHS · 01'}</span>
        </div>
        <Words
          text={end ? 'Make your webhook bulletproof' : 'Accept your first payment'}
          delay={6}
          stagger={3}
          style={{ marginTop: 26, fontFamily: fonts.sans, fontWeight: 600, fontSize: 96, letterSpacing: '-0.04em', color: bachs.ink }}
        />
        <div style={{ marginTop: 14, fontFamily: end ? fonts.mono : fonts.sans, fontSize: end ? 24 : 30, color: bachs.muted, opacity: ease(f, [24, 36], [0, 1]) }}>
          {end ? 'docs.bachs.io/guides/checkout/checkout-sessions' : cut.label}
        </div>
      </AbsoluteFill>
    );
  }
  if (card.kind === 'chapter' || card.kind === 'statement') {
    return (
      <AbsoluteFill style={center}>
        {card.kind === 'chapter' && (
          <div style={{ fontFamily: fonts.mono, fontSize: 22, letterSpacing: '0.24em', color: bachs.muted, opacity: ease(f, [0, 10], [0, 1]) }}>{card.n}</div>
        )}
        <Words
          text={card.kind === 'chapter' ? card.title : card.text}
          delay={4}
          stagger={3}
          style={{ marginTop: 20, maxWidth: 1400, textAlign: 'center', justifyContent: 'center', fontFamily: fonts.sans, fontWeight: 600, fontSize: card.kind === 'chapter' ? 80 : 84, letterSpacing: '-0.035em', color: bachs.ink }}
        />
      </AbsoluteFill>
    );
  }
  // What you need: three items, revealed as the narration reaches them.
  const items = ChecklistItems(cut.lang);
  return (
    <AbsoluteFill style={{ ...center, alignItems: 'flex-start', paddingLeft: 420 }}>
      <div style={{ fontFamily: fonts.mono, fontSize: 22, letterSpacing: '0.24em', color: bachs.muted }}>WHAT YOU NEED</div>
      <div style={{ marginTop: 36, display: 'flex', flexDirection: 'column', gap: 30 }}>
        {items.map(([a, b], i) => {
          const on = i < card.show;
          return (
            <div key={a} style={{ display: 'flex', alignItems: 'baseline', gap: 28, opacity: on ? 1 : 0.18 }}>
              <span style={{ fontFamily: fonts.mono, fontSize: 30, color: on ? bachs.indigo : bachs.muted, width: 40 }}>{String(i + 1).padStart(2, '0')}</span>
              <span style={{ fontFamily: fonts.sans, fontWeight: 600, fontSize: 58, letterSpacing: '-0.03em', color: bachs.ink }}>{a}</span>
              <span style={{ fontFamily: fonts.mono, fontSize: 24, color: bachs.muted }}>{b}</span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ overlays

// Top-right of the window: code is left-aligned, terminal shots show unused
// editor there, and the browser's address bar stops short of it, so the
// caption never covers what the shot is about.
const StepCaption: React.FC<{ n: string; text: string; frames: number; first: boolean; last: boolean; win: 'editor' | 'browser' }> = ({ n, text, frames, first, last, win }) => {
  const f = useCurrentFrame();
  const inT = first ? spring({ frame: f, fps: FPS, config: { damping: 18 } }) : 1;
  const out = last ? ease(f, [frames - 8, frames], [0, 1]) : 0;
  return (
    <div
      style={{
        position: 'absolute', right: (1920 - (win === 'browser' ? BROWSER.w : EDITOR.w)) / 2 + 18, top: TOP + (win === 'browser' ? BAR + 14 : 14), display: 'flex', alignItems: 'center', gap: 14,
        padding: '12px 22px 12px 14px', borderRadius: 14, background: 'rgba(17,17,17,0.88)', backdropFilter: 'blur(8px)',
        color: '#fff', fontFamily: fonts.sans, fontSize: 24, opacity: Math.min(1, inT * 1.5) * (1 - out), transform: `translateY(${(1 - inT) * 20}px)`,
      }}
    >
      <span style={{ fontFamily: fonts.mono, fontSize: 18, padding: '4px 10px', borderRadius: 8, background: bachs.indigo }}>{n}</span>
      {text}
    </div>
  );
};

// Stand-in for the voice: the script line under the window.
const Subtitle: React.FC<{ text: string; frames: number }> = ({ text, frames }) => {
  const f = useCurrentFrame();
  const o = ease(f, [0, 6], [0, 1]) * (1 - ease(f, [frames - 5, frames], [0, 1]));
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: TOP + EDITOR.h + 16, display: 'flex', justifyContent: 'center', opacity: o }}>
      <div style={{ maxWidth: 1500, textAlign: 'center', fontFamily: fonts.sans, fontSize: 27, lineHeight: 1.35, color: bachs.ink, textWrap: 'balance' } as React.CSSProperties}>
        {text}
      </div>
    </div>
  );
};

// ------------------------------------------------------------------ the cut

export const cutLength = (cut: Cut) => place(cut.chapters, cut.takes).total;

export const Episode01: React.FC<{ cut: Cut }> = ({ cut }) => {
  const frame = useCurrentFrame();
  const { beats, total } = React.useMemo(() => place(cut.chapters, cut.takes), [cut]);
  return (
    <AbsoluteFill style={{ background: `radial-gradient(120% 100% at 50% 0%, #ffffff 0%, ${bachs.paper} 45%, #e9ebf5 100%)` }}>
      <style>{fontFaceCss}</style>
      {beats.map((b, i) => {
        const prev = beats[i - 1];
        const next = beats[i + 1];
        const isTake = 'take' in b;
        const enter = isTake && !(prev && 'take' in prev && prev.win === b.win);
        return (
          <Sequence key={i} from={b.start} durationInFrames={b.frames} layout="none">
            {isTake ? <Window cut={cut} b={b as PlacedTake} prev={prev} enter={enter} /> : <CardView card={(b as { card: Card }).card} cut={cut} frames={b.frames} />}
            {isTake && b.step && (
              <StepCaption
                n={b.stepNo}
                text={b.step}
                frames={b.frames}
                win={(b as PlacedTake).win}
                first={!(prev && 'take' in prev && prev.step === b.step && prev.win === (b as PlacedTake).win)}
                last={!(next && 'take' in next && next.step === b.step && next.win === (b as PlacedTake).win)}
              />
            )}
            {b.say && <Subtitle text={b.say} frames={b.frames} />}
          </Sequence>
        );
      })}
      <AbsoluteFill style={{ background: bachs.paper, pointerEvents: 'none', opacity: interpolate(frame, [total - 12, total], [0, 1], clamp) }} />
    </AbsoluteFill>
  );
};
