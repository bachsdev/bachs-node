import React from 'react';
import { AbsoluteFill, Img, interpolate, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame } from 'remotion';
import { Words } from '../components';
import { clamp, ease } from '../motion';
import { bachs, fontFaceCss, fonts } from '../theme';
import events from './sample-events.json';

// "Build it with Bachs" tutorial style: a real screen recording (4K, from
// scripts/record) framed as a window on the brand background, with eased
// camera moves onto whatever is happening.

const FPS = 30;
const TITLE = 75; // title card length in frames, before the recording starts
const ev = Object.fromEntries(events.map((e) => [e.name, Math.round(e.t * FPS)])) as Record<string, number>;
export const SAMPLE_TOTAL = TITLE + ev.end + 40;

// Camera keys in recording frames: zoom factor and the point to centre (in the
// 1920x1080 layout of the recorded screen).
type Key = { f: number; z: number; x: number; y: number };
const keys: Key[] = [
  { f: 0, z: 1, x: 960, y: 540 },
  { f: ev.terminal - 4, z: 1, x: 960, y: 540 },
  { f: ev.terminal + 18, z: 2.0, x: 640, y: 810 },
  { f: ev.installed + 6, z: 2.0, x: 640, y: 810 },
  { f: ev['type-start'] - 2, z: 1.15, x: 960, y: 420 },
  { f: ev['type-start'] + 16, z: 2.1, x: 640, y: 150 },
  { f: ev['type-end'] + 18, z: 2.1, x: 640, y: 150 },
  { f: ev['type-end'] + 42, z: 1, x: 960, y: 540 },
];

const camera = (f: number) => {
  let k0 = keys[0];
  let k1 = keys[0];
  for (let i = 0; i < keys.length - 1; i++) {
    if (f >= keys[i].f) {
      k0 = keys[i];
      k1 = keys[i + 1];
    }
  }
  if (f >= keys[keys.length - 1].f) k0 = k1 = keys[keys.length - 1];
  const t = k0 === k1 ? 0 : ease(f, [k0.f, k1.f], [0, 1], (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2));
  return { z: k0.z + (k1.z - k0.z) * t, x: k0.x + (k1.x - k0.x) * t, y: k0.y + (k1.y - k0.y) * t };
};

const W = 1600; // window size on screen
const H = 900;

const Recording: React.FC = () => {
  const frame = useCurrentFrame();
  const { z, x, y } = camera(frame);
  const s = (W / 1920) * z;
  // Keep the focus point centred but never show past the recording's edges.
  const tx = Math.min(0, Math.max(W - 1920 * s, W / 2 - x * s));
  const ty = Math.min(0, Math.max(H - 1080 * s, H / 2 - y * s));
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, transformOrigin: '0 0', transform: `translate(${tx}px, ${ty}px) scale(${s})` }}>
      <OffthreadVideo src={staticFile('tutorial/sample-take.mp4')} style={{ width: 1920, height: 1080 }} />
    </div>
  );
};

const LowerThird: React.FC<{ step: string; text: string; from: number; to: number }> = ({ step, text, from, to }) => {
  const frame = useCurrentFrame();
  const inT = spring({ frame: frame - from, fps: FPS, config: { damping: 18 } });
  const out = ease(frame, [to - 8, to], [0, 1]);
  if (frame < from || frame > to) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: 160,
        bottom: 54,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '12px 22px 12px 14px',
        borderRadius: 14,
        background: 'rgba(17,17,17,0.88)',
        backdropFilter: 'blur(8px)',
        color: '#fff',
        fontFamily: fonts.sans,
        fontSize: 24,
        opacity: Math.min(1, inT * 1.5) * (1 - out),
        transform: `translateY(${(1 - inT) * 20}px)`,
      }}
    >
      <span style={{ fontFamily: fonts.mono, fontSize: 18, padding: '4px 10px', borderRadius: 8, background: bachs.indigo }}>{step}</span>
      {text}
    </div>
  );
};

const TitleCard: React.FC = () => {
  const frame = useCurrentFrame();
  const out = ease(frame, [TITLE - 12, TITLE], [0, 1]);
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: 1 - out }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, opacity: ease(frame, [2, 12], [0, 1]) }}>
        <Img src={staticFile('brand/bachs-logo.svg')} style={{ width: 44, height: 44 }} />
        <span style={{ fontFamily: fonts.mono, fontSize: 22, letterSpacing: '0.24em', color: bachs.muted }}>BUILD IT WITH BACHS · 01</span>
      </div>
      <Words
        text="Accept your first payment"
        delay={6}
        stagger={3}
        style={{ marginTop: 26, fontFamily: fonts.sans, fontWeight: 600, fontSize: 96, letterSpacing: '-0.04em', color: bachs.ink }}
      />
      <div style={{ marginTop: 14, fontFamily: fonts.sans, fontSize: 30, color: bachs.muted, opacity: ease(frame, [24, 36], [0, 1]) }}>Node.js · @bachs/sdk</div>
    </AbsoluteFill>
  );
};

export const TutorialSample: React.FC = () => {
  const frame = useCurrentFrame();
  const win = spring({ frame: frame - (TITLE - 10), fps: FPS, config: { damping: 20, stiffness: 90 } });
  return (
    <AbsoluteFill style={{ background: `radial-gradient(120% 100% at 50% 0%, #ffffff 0%, ${bachs.paper} 45%, #e9ebf5 100%)` }}>
      <style>{fontFaceCss}</style>
      <TitleCard />
      <Sequence from={TITLE}>
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
          <div
            style={{
              position: 'relative',
              width: W,
              height: H,
              borderRadius: 18,
              overflow: 'hidden',
              background: '#fff',
              boxShadow: '0 40px 100px rgba(23,26,60,0.22), 0 8px 24px rgba(23,26,60,0.10), 0 0 0 1px rgba(17,17,17,0.06)',
              opacity: Math.min(1, win * 1.4),
              transform: `translateY(${(1 - win) * 60}px) scale(${0.96 + win * 0.04})`,
            }}
          >
            <Recording />
          </div>
        </AbsoluteFill>
        <LowerThird step="1" text="Install the SDK from npm" from={ev.terminal} to={ev.installed + 14} />
        <LowerThird step="2" text="Create a Bachs client" from={ev['type-start']} to={ev['type-end'] + 30} />
      </Sequence>
      <AbsoluteFill style={{ background: bachs.paper, opacity: interpolate(frame, [SAMPLE_TOTAL - 14, SAMPLE_TOTAL], [0, 1], clamp) }} />
    </AbsoluteFill>
  );
};
