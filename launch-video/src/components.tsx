import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { clamp, ease, soft } from './motion';
import { bachs, fonts } from './theme';

// Sky-to-peach gradient from the SnapKit demo screenshots, drifting slowly so
// the frame never feels static between scenes.
export const Stage: React.FC<{ tone?: 'sky' | 'paper' | 'night' }> = ({ tone = 'sky' }) => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 90) * 6;
  const bg =
    tone === 'sky'
      ? `radial-gradient(120% 90% at ${30 + drift}% 0%, #2c5a8c 0%, #6f98c4 38%, #c9c6c0 62%, #e8b77c 84%, #f0c56f 100%)`
      : tone === 'night'
        ? `radial-gradient(100% 80% at ${50 + drift}% 10%, #1b1e33 0%, #0d0e16 70%)`
        : `radial-gradient(120% 90% at ${50 + drift}% 0%, #ffffff 0%, ${bachs.paper} 55%, #eef0f7 100%)`;
  return <AbsoluteFill style={{ background: bg, zIndex: -1 }} />;
};

// Fine grain keeps flat colors from looking computer-generated.
export const Grain: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', opacity: 0.07, mixBlendMode: 'overlay' }}>
      <svg width="100%" height="100%">
        <filter id="g">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={frame % 8} />
        </filter>
        <rect width="100%" height="100%" filter="url(#g)" />
      </svg>
    </AbsoluteFill>
  );
};

// Each scene eases in from a soft blur and hands off by drifting up and blurring out.
export const SceneShell: React.FC<{ dur: number; children: React.ReactNode; exit?: boolean }> = ({ dur, children, exit = true }) => {
  const frame = useCurrentFrame();
  const inT = ease(frame, [0, 18], [0, 1]);
  const outT = exit ? ease(frame, [dur - 16, dur], [0, 1]) : 0;
  const opacity = inT * (1 - outT);
  const blur = (1 - inT) * 14 + outT * 18;
  const scale = interpolate(inT, [0, 1], [1.035, 1]) * interpolate(outT, [0, 1], [1, 0.975]);
  const y = outT * -24;
  return (
    <AbsoluteFill style={{ opacity, filter: `blur(${blur}px)`, transform: `translateY(${y}px) scale(${scale})` }}>
      {children}
    </AbsoluteFill>
  );
};

// Word-by-word reveal: each word rises, sharpens, and settles on its own spring.
export const Words: React.FC<{
  text: string;
  delay?: number;
  stagger?: number;
  style?: React.CSSProperties;
  highlight?: string[];
  highlightColor?: string;
}> = ({ text, delay = 0, stagger = 3, style, highlight = [], highlightColor = bachs.indigo }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(' ');
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', columnGap: '0.26em', ...style }}>
      {words.map((w, i) => {
        // Small per-word timing wobble so the cadence feels human.
        const wobble = ((i * 7) % 5) - 2;
        const t = soft(frame, fps, delay + i * stagger + wobble * 0.6, 18);
        const hl = highlight.includes(w.replace(/[.,]/g, ''));
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              opacity: interpolate(t, [0, 0.6], [0, 1], clamp),
              filter: `blur(${(1 - Math.min(t, 1)) * 10}px)`,
              transform: `translateY(${(1 - t) * 28}px)`,
              color: hl ? highlightColor : undefined,
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
};

export const Caption: React.FC<{ text: string; delay?: number; top?: number; dark?: boolean; highlight?: string[] }> = ({
  text,
  delay = 0,
  top = 70,
  dark = false,
  highlight,
}) => (
  <div style={{ position: 'absolute', top, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
    <Words
      text={text}
      delay={delay}
      highlight={highlight}
      highlightColor={dark ? '#aab4ff' : bachs.indigo}
      style={{
        fontFamily: fonts.sans,
        fontWeight: 560,
        fontSize: 52,
        letterSpacing: '-0.025em',
        color: dark ? '#f4f4f6' : bachs.ink,
        maxWidth: 1400,
      }}
    />
  </div>
);

// Chrome-style browser window, matching the frame in the SnapKit demo shots.
export const Browser: React.FC<{
  url: string;
  title: string;
  width: number;
  height: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ url, title, width, height, children, style }) => (
  <div
    style={{
      width,
      height,
      borderRadius: 18,
      overflow: 'hidden',
      background: '#fff',
      boxShadow: '0 40px 120px rgba(10,20,40,0.35), 0 8px 24px rgba(10,20,40,0.18), 0 0 0 1px rgba(255,255,255,0.4)',
      display: 'flex',
      flexDirection: 'column',
      ...style,
    }}
  >
    <div style={{ background: '#dfe3f3', height: 44, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 9 }}>
      {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
        <div key={c} style={{ width: 13, height: 13, borderRadius: 7, background: c }} />
      ))}
      <div
        style={{
          marginLeft: 22,
          marginTop: 8,
          alignSelf: 'flex-end',
          height: 36,
          padding: '0 18px',
          background: '#fff',
          borderRadius: '10px 10px 0 0',
          display: 'flex',
          alignItems: 'center',
          fontFamily: fonts.sans,
          fontSize: 15,
          color: '#222',
          minWidth: 240,
        }}
      >
        {title}
      </div>
    </div>
    <div style={{ height: 50, background: '#fff', display: 'flex', alignItems: 'center', padding: '0 18px', borderBottom: '1px solid #e6e8ef' }}>
      <div style={{ fontFamily: fonts.sans, color: '#777', fontSize: 18, letterSpacing: 6 }}>←→↻</div>
      <div
        style={{
          marginLeft: 18,
          flex: 1,
          height: 34,
          borderRadius: 17,
          background: '#eef0f6',
          display: 'flex',
          alignItems: 'center',
          padding: '0 18px',
          fontFamily: fonts.sans,
          fontSize: 16,
          color: '#333',
        }}
      >
        {url}
      </div>
    </div>
    <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>{children}</div>
  </div>
);

// A pointer that travels on eased curves, and dips when it clicks.
export type CursorKey = { f: number; x: number; y: number; click?: boolean };
export const Cursor: React.FC<{ keys: CursorKey[]; appear?: number }> = ({ keys, appear = 0 }) => {
  const frame = useCurrentFrame();
  let x = keys[0].x;
  let y = keys[0].y;
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (frame >= a.f && frame <= b.f) {
      const t = ease(frame, [a.f, b.f], [0, 1]);
      // A gentle arc instead of a straight line, like a hand moving a mouse.
      const arc = Math.sin(t * Math.PI) * Math.min(60, Math.hypot(b.x - a.x, b.y - a.y) * 0.12);
      x = a.x + (b.x - a.x) * t;
      y = a.y + (b.y - a.y) * t - arc;
    } else if (frame > b.f) {
      x = b.x;
      y = b.y;
    }
  }
  const clickPulse = keys
    .filter((k) => k.click)
    .reduce((acc, k) => Math.max(acc, interpolate(frame, [k.f, k.f + 4, k.f + 12], [0, 1, 0], clamp)), 0);
  const ring = keys
    .filter((k) => k.click)
    .map((k) => ({ k, t: interpolate(frame, [k.f, k.f + 18], [0, 1], clamp) }))
    .filter(({ t }) => t > 0 && t < 1);
  const opacity = interpolate(frame, [appear, appear + 8], [0, 1], clamp);
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, opacity, pointerEvents: 'none' }}>
      {ring.map(({ k, t }) => (
        <div
          key={k.f}
          style={{
            position: 'absolute',
            left: k.x - 30 * t,
            top: k.y - 30 * t,
            width: 60 * t,
            height: 60 * t,
            borderRadius: '50%',
            border: `2px solid rgba(82,102,235,${0.6 * (1 - t)})`,
          }}
        />
      ))}
      <svg
        width="34"
        height="40"
        viewBox="0 0 17 20"
        style={{
          position: 'absolute',
          left: x - 3,
          top: y - 2,
          transform: `scale(${1 - clickPulse * 0.14})`,
          transformOrigin: '3px 2px',
          filter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.35))',
        }}
      >
        <path d="M1.5 1.5 L1.5 16 L5.3 12.4 L8 18.5 L10.6 17.4 L8 11.4 L13.2 11.4 Z" fill="#111" stroke="#fff" strokeWidth="1.3" strokeLinejoin="round" />
      </svg>
    </div>
  );
};

// A sequence of captions that hand off to each other in place.
export const CaptionSeq: React.FC<{ items: { from: number; to: number; text: string; highlight?: string[] }[]; dark?: boolean }> = ({ items, dark }) => {
  const frame = useCurrentFrame();
  return (
    <>
      {items.map((cap) => {
        const o = ease(frame, [cap.from, cap.from + 8], [0, 1]) * (1 - ease(frame, [cap.to - 4, cap.to + 6], [0, 1]));
        return o > 0 ? (
          <div key={cap.text} style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none', opacity: o, filter: `blur(${(1 - o) * 6}px)` }}>
            <Caption text={cap.text} delay={cap.from + 2} dark={dark} highlight={cap.highlight} />
          </div>
        ) : null;
      })}
    </>
  );
};
