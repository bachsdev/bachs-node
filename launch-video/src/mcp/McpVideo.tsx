import React from 'react';
import { AbsoluteFill, Audio, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Cursor, Words } from '../components';
import { clamp, ease } from '../motion';
import { fontFaceCss, fonts } from '../theme';
import { keyTimes, typed } from '../skills/grid';
import { at, BEAT, cue, Q1, Q2, URL_TEXT } from './grid';

// MCP palette: the violet family from the Bachs blog styles, on lavender.
const mc = {
  bg: '#f1eef9',
  bg2: '#e7e1f6',
  violet: '#9b78d9',
  deep: '#5b42bb',
  ink: '#1d1a2e',
  muted: '#6f6a80',
  faint: '#a9a3ba',
  line: 'rgba(29,26,46,0.10)',
  card: '#ffffff',
  green: '#2f9e6b',
  // The Bachs dashboard's own neutrals (from the Developer Portal).
  dashBg: '#ffffff',
  dashSide: '#f6f6f8',
  dashText: '#1f1f24',
  dashMuted: '#6b6b76',
  dashLine: '#ececf0',
  dashAccent: '#5b5fe8',
};

const sp = (frame: number, from: number, damping = 16, stiffness = 140) =>
  spring({ frame: frame - from, fps: 30, config: { damping, stiffness, mass: 0.8 } });
const win = (frame: number, from: number, to: number, fi = 6, fo = 8) =>
  Math.min(ease(frame, [from, from + fi], [0, 1]), 1 - ease(frame, [to - fo, to], [0, 1]));

const Backdrop: React.FC = () => {
  const frame = useCurrentFrame();
  const d = Math.sin(frame / 80) * 8;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(120% 90% at ${50 + d}% 0%, #ffffff 0%, ${mc.bg} 50%, ${mc.bg2} 100%)` }}>
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${mc.line} 1px, transparent 1px), linear-gradient(90deg, ${mc.line} 1px, transparent 1px)`,
          backgroundSize: '64px 64px',
          backgroundPosition: `${frame * 0.2}px ${frame * 0.1}px`,
          opacity: 0.35,
          maskImage: 'radial-gradient(70% 60% at 50% 50%, black, transparent)',
        }}
      />
    </AbsoluteFill>
  );
};

const Cap: React.FC<{ text: string; from: number; to: number; highlight?: string[]; top?: number }> = ({ text, from, to, highlight, top = 70 }) => {
  const frame = useCurrentFrame();
  const o = win(frame, from, to, 4, 8);
  if (o <= 0) return null;
  return (
    <div style={{ position: 'absolute', top, left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity: o, zIndex: 6 }}>
      <Words
        text={text}
        delay={from}
        stagger={2}
        highlight={highlight}
        highlightColor={mc.deep}
        style={{ fontFamily: fonts.sans, fontWeight: 580, fontSize: 52, letterSpacing: '-0.03em', color: mc.ink }}
      />
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Hook (bar 1)                                                        */
/* ------------------------------------------------------------------ */

const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const out = ease(frame, [cue.connector - 8, cue.connector + 2], [0, 1]);
  const qs = ['Revenue this week?', 'Past-due subscriptions?', 'Balance in NGN?', 'Last payout?'];
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: 1 - out, transform: `scale(${1 + out * 0.08})`, filter: `blur(${out * 10}px)` }}>
      <Words
        text="Ask your Bachs account anything."
        delay={2}
        stagger={3}
        highlight={['anything']}
        highlightColor={mc.deep}
        style={{ fontFamily: fonts.sans, fontWeight: 620, fontSize: 104, letterSpacing: '-0.045em', color: mc.ink, maxWidth: 1500 }}
      />
      <div style={{ display: 'flex', gap: 18, marginTop: 44 }}>
        {qs.map((q, i) => {
          const s = sp(frame, 14 + i * Math.round(BEAT / 2), 14, 200);
          return (
            <div
              key={q}
              style={{
                padding: '14px 22px',
                borderRadius: 999,
                background: mc.card,
                border: `1px solid ${mc.line}`,
                boxShadow: '0 10px 30px rgba(91,66,187,0.12)',
                fontFamily: fonts.sans,
                fontSize: 26,
                color: mc.muted,
                opacity: Math.min(1, s * 1.6),
                transform: `translateY(${(1 - s) * 24}px)`,
              }}
            >
              {q}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* Assistant panel + the line to Bachs                                 */
/* ------------------------------------------------------------------ */

type Msg = { role: 'user' | 'tool' | 'answer'; node: React.ReactNode; from: number };

const Panel: React.FC<{ name: string; dot: string; children: React.ReactNode; composer: React.ReactNode; style?: React.CSSProperties }> = ({
  name,
  dot,
  children,
  composer,
  style,
}) => (
  <div
    style={{
      position: 'absolute',
      left: 130,
      top: 190,
      width: 900,
      height: 800,
      background: mc.card,
      borderRadius: 24,
      border: `1px solid ${mc.line}`,
      boxShadow: '0 40px 100px rgba(41,25,99,0.18), 0 6px 18px rgba(41,25,99,0.08)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      ...style,
    }}
  >
    <div style={{ height: 64, display: 'flex', alignItems: 'center', gap: 14, padding: '0 28px', borderBottom: `1px solid ${mc.line}` }}>
      <div style={{ width: 14, height: 14, borderRadius: 7, background: dot }} />
      <span style={{ fontFamily: fonts.sans, fontWeight: 600, fontSize: 24, color: mc.ink }}>{name}</span>
      <span style={{ marginLeft: 'auto', fontFamily: fonts.mono, fontSize: 16, color: mc.faint }}>connectors: Bachs</span>
    </div>
    <div style={{ flex: 1, padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 18, overflow: 'hidden' }}>{children}</div>
    <div style={{ margin: '0 24px 24px', borderRadius: 16, border: `1.5px solid ${mc.line}`, padding: '18px 22px', fontFamily: fonts.sans, fontSize: 26, color: mc.ink, minHeight: 34 }}>
      {composer}
    </div>
  </div>
);

const Bubble: React.FC<{ frame: number; from: number; children: React.ReactNode; user?: boolean }> = ({ frame, from, children, user }) => {
  const s = sp(frame, from, 15, 180);
  if (frame < from) return null;
  return (
    <div
      style={{
        alignSelf: user ? 'flex-end' : 'stretch',
        maxWidth: user ? 620 : undefined,
        background: user ? mc.bg : 'transparent',
        borderRadius: 18,
        padding: user ? '14px 20px' : 0,
        fontFamily: fonts.sans,
        fontSize: 25,
        lineHeight: 1.45,
        color: mc.ink,
        opacity: Math.min(1, s * 1.6),
        transform: `translateY(${(1 - s) * 16}px)`,
      }}
    >
      {children}
    </div>
  );
};

const ToolChip: React.FC<{ name: string; frame: number; from: number; done: number }> = ({ name, frame, from, done }) => {
  if (frame < from - 2) return null;
  const ok = frame >= done;
  return (
    <div
      style={{
        alignSelf: 'flex-start',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        fontFamily: fonts.mono,
        fontSize: 18,
        color: ok ? mc.deep : mc.muted,
        background: ok ? 'rgba(155,120,217,0.14)' : mc.bg,
        border: `1px solid ${ok ? 'rgba(91,66,187,0.35)' : mc.line}`,
        borderRadius: 999,
        padding: '7px 14px',
        opacity: ease(frame, [from - 2, from + 4], [0, 1]),
      }}
    >
      <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 4, background: ok ? mc.green : mc.violet, opacity: ok ? 1 : 0.5 + 0.5 * Math.sin(frame / 2) }} />
      Bachs · {name}
      <span style={{ color: mc.faint }}>{ok ? '✓' : '…'}</span>
    </div>
  );
};

// The connection: a dotted line from the panel to the Bachs node, with a
// packet travelling out on the tool call and back with the answer.
const Wire: React.FC<{ frame: number; out: number; back: number; appear: number; label: string }> = ({ frame, out, back, appear, label }) => {
  const x0 = 1030;
  const x1 = 1500;
  const y = 590;
  const draw = ease(frame, [appear, appear + 14], [0, 1]);
  const goT = ease(frame, [out, back], [0, 1], (t) => t * t * (3 - 2 * t));
  const backT = ease(frame, [back, back + BEAT * 0.9], [0, 1], (t) => t * t * (3 - 2 * t));
  const going = frame >= out && frame < back;
  const returning = frame >= back && frame < back + BEAT * 0.9;
  const pulse = interpolate(frame, [back - 2, back + 3, back + 16], [0, 1, 0], clamp);
  const px = going ? x0 + (x1 - x0 - 90) * goT : x1 - 90 - (x1 - x0 - 90) * backT;
  return (
    <>
      <svg width="1920" height="1080" style={{ position: 'absolute', inset: 0 }}>
        <line x1={x0} y1={y} x2={x0 + (x1 - 90 - x0) * draw} y2={y} stroke={mc.violet} strokeWidth="3" strokeDasharray="3 10" strokeLinecap="round" />
      </svg>
      {(going || returning) && (
        <div
          style={{
            position: 'absolute',
            left: px - (going ? 0 : 10),
            top: y - 22,
            padding: going ? '8px 16px' : 0,
            width: going ? undefined : 20,
            height: going ? undefined : 20,
            marginTop: going ? 0 : 12,
            borderRadius: 999,
            background: going ? mc.deep : mc.green,
            color: '#fff',
            fontFamily: fonts.mono,
            fontSize: 18,
            whiteSpace: 'nowrap',
            boxShadow: '0 8px 24px rgba(91,66,187,0.35)',
            transform: going ? 'translateX(-50%)' : undefined,
          }}
        >
          {going ? label : ''}
        </div>
      )}
      <div
        style={{
          position: 'absolute',
          left: x1 - 90,
          top: y - 90,
          width: 180,
          height: 180,
          borderRadius: 40,
          background: mc.card,
          border: `1px solid ${mc.line}`,
          boxShadow: `0 30px 70px rgba(41,25,99,0.18), 0 0 0 ${pulse * 18}px rgba(155,120,217,${0.25 * pulse})`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          opacity: draw,
          transform: `scale(${0.9 + draw * 0.1 + pulse * 0.04})`,
        }}
      >
        <Img src={staticFile('brand/bachs-logo.svg')} style={{ width: 68, height: 68 }} />
        <div style={{ fontFamily: fonts.mono, fontSize: 16, color: mc.muted }}>SnapKit</div>
      </div>
    </>
  );
};

/* ------------------------------------------------------------------ */
/* Claude: connect, consent, ask (bars 2–4)                            */
/* ------------------------------------------------------------------ */

const urlTimes = keyTimes(URL_TEXT, cue.urlType[0], cue.urlType[1], 'mcp-url');
const q1Times = keyTimes(Q1, cue.q1[0], cue.q1[1], 'q1');
const q2Times = keyTimes(Q2, cue.q2[0], cue.q2[1], 'q2');

const Masked: React.FC<{ children: React.ReactNode }> = ({ children }) => <span style={{ color: mc.muted, fontFamily: fonts.mono, fontSize: 21 }}>{children}</span>;

const pastDue = [
  { who: 'J••• O•••', plan: 'Pro, monthly', amount: '$19.00', since: '3 days' },
  { who: 'A••• K•••', plan: 'Team, monthly', amount: '$39.00', since: '5 days' },
  { who: 'M••• C•••', plan: 'Pro, annual', amount: '$190.00', since: '9 days' },
];

const ClaudeScene: React.FC = () => {
  const frame = useCurrentFrame();
  const enter = sp(frame, cue.connector, 18, 130);
  const leave = ease(frame, [cue.switch, cue.switch + 14], [0, 1], (t) => t * t);
  const consentIn = sp(frame, cue.consent, 15, 170);
  const consentOut = ease(frame, [cue.allow + 4, cue.allow + 14], [0, 1]);
  const connected = frame >= cue.allow + 4;
  const sent = frame >= cue.send1;
  const composer = sent ? '' : frame >= cue.q1[0] ? typed(Q1, q1Times, frame) : '';
  const caret = !sent && frame >= cue.allow + 10 && Math.floor(frame / 12) % 2 === 0;
  return (
    <AbsoluteFill style={{ opacity: 1 - leave, transform: `translateX(${-leave * 700}px) rotate(${-leave * 4}deg)` }}>
      <Panel
        name="Claude"
        dot="#e5937a"
        style={{ opacity: Math.min(1, enter * 1.5), transform: `translateY(${(1 - enter) * 80}px)` }}
        composer={
          <>
            {composer || <span style={{ color: mc.faint }}>{connected ? '' : 'Reply…'}</span>}
            {caret && <span style={{ display: 'inline-block', width: 3, height: 30, background: mc.deep, verticalAlign: 'middle', marginLeft: 2 }} />}
          </>
        }
      >
        {/* Connector setup, replaced by the conversation once connected. */}
        {!connected || frame < cue.allow + 10 ? (
          <div style={{ border: `1.5px solid ${mc.line}`, borderRadius: 18, padding: '24px 26px', opacity: 1 - ease(frame, [cue.allow + 2, cue.allow + 10], [0, 1]) }}>
            <div style={{ fontFamily: fonts.sans, fontWeight: 600, fontSize: 26, color: mc.ink }}>Add custom connector</div>
            <div style={{ fontFamily: fonts.sans, fontSize: 18, color: mc.muted, marginTop: 18 }}>Name</div>
            <div style={{ fontFamily: fonts.sans, fontSize: 24, color: mc.ink, marginTop: 6, padding: '12px 16px', border: `1px solid ${mc.line}`, borderRadius: 10 }}>Bachs</div>
            <div style={{ fontFamily: fonts.sans, fontSize: 18, color: mc.muted, marginTop: 16 }}>Server URL</div>
            <div style={{ fontFamily: fonts.mono, fontSize: 23, color: mc.ink, marginTop: 6, padding: '12px 16px', border: `1.5px solid ${mc.violet}`, borderRadius: 10, minHeight: 30 }}>
              {typed(URL_TEXT, urlTimes, frame)}
            </div>
          </div>
        ) : null}
        {connected && (
          <div
            style={{
              alignSelf: 'center',
              fontFamily: fonts.sans,
              fontSize: 20,
              color: mc.green,
              background: 'rgba(47,158,107,0.10)',
              borderRadius: 999,
              padding: '8px 18px',
              opacity: ease(frame, [cue.allow + 4, cue.allow + 10], [0, 1]),
            }}
          >
            ✓ Connected to Bachs
          </div>
        )}
        <Bubble frame={frame} from={cue.send1} user>
          {Q1}
        </Bubble>
        <ToolChip name="list_subscriptions" frame={frame} from={cue.chip1} done={cue.answer1} />
        <Bubble frame={frame} from={cue.answer1}>
          <div>Three subscriptions are past due:</div>
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pastDue.map((r, i) => (
              <div
                key={r.who}
                style={{
                  display: 'flex',
                  gap: 18,
                  alignItems: 'baseline',
                  padding: '10px 16px',
                  borderRadius: 12,
                  background: mc.bg,
                  opacity: ease(frame, [cue.answer1 + 4 + i * 5, cue.answer1 + 10 + i * 5], [0, 1]),
                }}
              >
                <Masked>{r.who}</Masked>
                <span style={{ flex: 1 }}>{r.plan}</span>
                <span style={{ fontWeight: 600 }}>{r.amount}</span>
                <span style={{ color: mc.muted, fontSize: 20 }}>{r.since}</span>
              </div>
            ))}
          </div>
        </Bubble>
      </Panel>
      <Wire frame={frame} appear={cue.allow + 2} out={cue.chip1} back={cue.back1} label="list_subscriptions" />

      {/* The Bachs consent screen, in the dashboard's style. */}
      {frame >= cue.consent - 1 && consentOut < 1 && (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', background: `rgba(29,26,46,${0.28 * consentIn * (1 - consentOut)})` }}>
          <div
            style={{
              width: 760,
              background: mc.dashBg,
              borderRadius: 22,
              boxShadow: '0 50px 120px rgba(20,14,50,0.35)',
              padding: '40px 44px 36px',
              opacity: Math.min(1, consentIn * 1.6) * (1 - consentOut),
              transform: `translateY(${(1 - consentIn) * 120 + consentOut * -40}px) scale(${0.96 + consentIn * 0.04})`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <Img src={staticFile('brand/bachs-logo.svg')} style={{ width: 40, height: 40 }} />
              <span style={{ fontFamily: fonts.sans, fontSize: 20, color: mc.dashMuted }}>SnapKit · Bachs</span>
            </div>
            <div style={{ fontFamily: fonts.sans, fontWeight: 600, fontSize: 36, color: mc.dashText, marginTop: 24, letterSpacing: '-0.02em' }}>
              Claude wants to read this account
            </div>
            <div style={{ fontFamily: fonts.sans, fontSize: 22, color: mc.dashMuted, marginTop: 14, lineHeight: 1.5 }}>
              It will be able to read: products, payments, subscriptions, balances, payouts.
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 22, fontFamily: fonts.sans, fontSize: 20, color: mc.dashText }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, border: `1.5px solid ${mc.dashMuted}` }} />
              Show customer details in full
            </div>
            <div style={{ display: 'flex', gap: 14, marginTop: 32, justifyContent: 'flex-end' }}>
              <div style={{ padding: '14px 28px', borderRadius: 12, border: `1px solid ${mc.dashLine}`, fontFamily: fonts.sans, fontSize: 21, color: mc.dashText }}>Deny</div>
              <div
                style={{
                  padding: '14px 34px',
                  borderRadius: 12,
                  background: mc.dashAccent,
                  color: '#fff',
                  fontFamily: fonts.sans,
                  fontWeight: 600,
                  fontSize: 21,
                  transform: `scale(${1 - interpolate(frame, [cue.allow, cue.allow + 2, cue.allow + 8], [0, 1, 0], clamp) * 0.06})`,
                }}
              >
                Allow
              </div>
            </div>
          </div>
        </AbsoluteFill>
      )}
      <Cursor
        appear={cue.consent}
        keys={[
          { f: cue.consent, x: 1300, y: 900 },
          { f: cue.allow - 3, x: 1252, y: 712 },
          { f: cue.allow, x: 1252, y: 712, click: true },
          { f: cue.allow + 30, x: 1400, y: 980 },
        ]}
      />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* Switch (bar 5) and ChatGPT (bars 6–8)                               */
/* ------------------------------------------------------------------ */

const balances = [
  { cur: 'NGN', value: 1842650.4, sym: '₦', dp: 2 },
  { cur: 'USD', value: 4210.75, sym: '$', dp: 2 },
  { cur: 'GHS', value: 18930.0, sym: 'GH₵', dp: 2 },
  { cur: 'KES', value: 96400.0, sym: 'KSh', dp: 2 },
];
const fmt = (v: number, dp: number) => v.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });

const ChatGptScene: React.FC = () => {
  const frame = useCurrentFrame();
  const land = sp(frame, cue.chatgpt, 13, 190);
  const leave = ease(frame, [cue.apps - 6, cue.apps + 8], [0, 1]);
  const sent = frame >= cue.send2;
  const composer = sent ? '' : frame >= cue.q2[0] ? typed(Q2, q2Times, frame) : '';
  const caret = !sent && Math.floor(frame / 12) % 2 === 0;
  const count = ease(frame, [cue.answer2 + 4, cue.answer2 + BEAT * 2], [0, 1], (t) => 1 - Math.pow(1 - t, 3));
  return (
    <AbsoluteFill style={{ opacity: 1 - leave, transform: `scale(${1 - leave * 0.05})` }}>
      <Panel
        name="ChatGPT"
        dot="#6fbf9c"
        style={{ opacity: Math.min(1, land * 2), transform: `translateX(${(1 - land) * 900}px) rotate(${(1 - land) * 5}deg)` }}
        composer={
          <>
            {composer || <span style={{ color: mc.faint }}>{sent ? '' : 'Ask anything'}</span>}
            {caret && <span style={{ display: 'inline-block', width: 3, height: 30, background: mc.deep, verticalAlign: 'middle', marginLeft: 2 }} />}
          </>
        }
      >
        <Bubble frame={frame} from={cue.send2} user>
          {Q2}
        </Bubble>
        <ToolChip name="get_balances" frame={frame} from={cue.chip2} done={cue.answer2} />
        <Bubble frame={frame} from={cue.answer2}>
          <div>Here's SnapKit's balance in each currency:</div>
          <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {balances.map((b, i) => (
              <div key={b.cur} style={{ padding: '16px 20px', borderRadius: 14, background: mc.bg, opacity: ease(frame, [cue.answer2 + i * 3, cue.answer2 + 6 + i * 3], [0, 1]) }}>
                <div style={{ fontFamily: fonts.mono, fontSize: 18, color: mc.muted, letterSpacing: '0.1em' }}>{b.cur}</div>
                <div style={{ fontFamily: fonts.sans, fontWeight: 600, fontSize: 36, color: mc.ink, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
                  {b.sym}
                  {fmt(b.value * count, b.dp)}
                </div>
              </div>
            ))}
          </div>
        </Bubble>
      </Panel>
      <Wire frame={frame} appear={cue.chatgpt + 6} out={cue.chip2} back={cue.back2} label="get_balances" />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* Connected apps (bars 9–10), rebuilt from the Developer Portal        */
/* ------------------------------------------------------------------ */

const apps = [
  { name: 'Claude', details: 'Partly hidden', by: 'Maya Chen', used: '2 minutes ago' },
  { name: 'ChatGPT', details: 'Partly hidden', by: 'ops@snapkit.dev', used: 'Just now' },
  { name: 'Claude Code', details: 'Partly hidden', by: 'Tunde Bello', used: '20 minutes ago' },
];

const ConnectedApps: React.FC = () => {
  const frame = useCurrentFrame();
  const enter = sp(frame, cue.apps, 18, 120);
  const out = ease(frame, [cue.names[0] - 8, cue.names[0] + 4], [0, 1]);
  const drawer = sp(frame, cue.drawer, 16, 160);
  const rowOn = frame >= cue.rowClick;
  const hoverT = ease(frame, [cue.hover + 6, cue.hover + 12], [0, 1]);
  const td: React.CSSProperties = { fontFamily: fonts.sans, fontSize: 19, color: mc.dashText, padding: '22px 24px' };
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: 1 - out, filter: `blur(${out * 8}px)` }}>
      <div
        style={{
          position: 'relative',
          width: 1640,
          height: 860,
          marginTop: 120,
          background: mc.dashBg,
          borderRadius: 22,
          overflow: 'hidden',
          boxShadow: '0 50px 120px rgba(41,25,99,0.22), 0 0 0 1px rgba(29,26,46,0.06)',
          display: 'flex',
          opacity: Math.min(1, enter * 1.5),
          transform: `translateY(${(1 - enter) * 120}px) scale(${0.94 + enter * 0.06})`,
        }}
      >
        <div style={{ width: 290, background: mc.dashSide, borderRight: `1px solid ${mc.dashLine}`, padding: '22px 14px', fontFamily: fonts.sans, fontSize: 19, color: mc.dashText }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, border: `1px solid ${mc.dashLine}`, background: '#fff', fontWeight: 600 }}>
            <span style={{ width: 28, height: 28, borderRadius: 8, background: '#141412', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>S</span>
            SnapKit
          </div>
          {['Home', 'Balance', 'Payments', 'Customers', 'Products', 'Payment Links', 'Connect', 'Billing'].map((n) => (
            <div key={n} style={{ padding: '12px 16px', marginTop: 4, color: mc.dashText }}>
              {n}
            </div>
          ))}
          <div style={{ marginTop: 120, padding: '12px 16px', borderRadius: 10, background: '#ececf2', fontWeight: 600 }}>{'</>'}&nbsp;&nbsp;Developer Portal</div>
        </div>
        <div style={{ flex: 1, padding: '44px 48px', position: 'relative' }}>
          <div style={{ fontFamily: fonts.sans, fontWeight: 500, fontSize: 40, letterSpacing: '-0.03em', color: mc.dashText }}>Developer Portal</div>
          <div style={{ display: 'flex', gap: 30, marginTop: 26, borderBottom: `1px solid ${mc.dashLine}`, fontFamily: fonts.sans, fontSize: 19, color: mc.dashText }}>
            {['API Keys', 'Webhooks', 'Events', 'Logs', 'Connected apps'].map((t) => (
              <div key={t} style={{ paddingBottom: 14, color: t === 'Connected apps' ? mc.dashAccent : mc.dashText, borderBottom: t === 'Connected apps' ? `2px solid ${mc.dashAccent}` : '2px solid transparent' }}>
                {t}
              </div>
            ))}
          </div>
          <div style={{ fontFamily: fonts.sans, fontSize: 32, letterSpacing: '-0.02em', color: mc.dashText, marginTop: 30 }}>Connected apps</div>
          <div style={{ fontFamily: fonts.sans, fontSize: 19, color: mc.dashText, marginTop: 8 }}>AI apps like Claude and ChatGPT that can read this account.</div>
          <div style={{ fontFamily: fonts.sans, fontSize: 18, fontWeight: 500, color: mc.dashText, marginTop: 24 }}>Connector URL</div>
          <div style={{ marginTop: 10, width: 640, display: 'flex', border: `1px solid ${mc.dashLine}`, borderRadius: 8 }}>
            <div style={{ flex: 1, padding: '14px 16px', fontFamily: fonts.mono, fontSize: 18 }}>{URL_TEXT}</div>
            <div style={{ width: 50, borderLeft: `1px solid ${mc.dashLine}` }} />
          </div>
          <div style={{ marginTop: 32 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr 1.2fr 1fr', borderBottom: `1px solid ${mc.dashLine}` }}>
              {['App', 'Customer details', 'Connected by', 'Last used'].map((h) => (
                <div key={h} style={{ ...td, fontSize: 16, color: mc.dashMuted, padding: '14px 24px' }}>
                  {h}
                </div>
              ))}
            </div>
            {apps.map((a, i) => {
              const s = sp(frame, cue.apps + 6 + i * 4, 18, 180);
              const active = rowOn && a.name === 'ChatGPT';
              return (
                <div
                  key={a.name}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.1fr 1fr 1.2fr 1fr',
                    borderBottom: `1px solid ${mc.dashLine}`,
                    background: active ? '#f0f0f3' : 'transparent',
                    opacity: Math.min(1, s * 1.6),
                    transform: `translateY(${(1 - s) * 14}px)`,
                  }}
                >
                  <div style={{ ...td, fontWeight: 600 }}>{a.name}</div>
                  <div style={td}>{a.details}</div>
                  <div style={td}>{a.by}</div>
                  <div style={td}>{a.used}</div>
                </div>
              );
            })}
          </div>

          {/* Detail drawer, as in the dashboard. */}
          {frame >= cue.drawer - 1 && (
            <div
              style={{
                position: 'absolute',
                top: 14,
                right: 14,
                bottom: 14,
                width: 560,
                background: '#fff',
                borderRadius: 20,
                boxShadow: '0 30px 80px rgba(20,14,50,0.18), 0 0 0 1px rgba(29,26,46,0.06)',
                padding: '34px 30px',
                fontFamily: fonts.sans,
                transform: `translateX(${(1 - drawer) * 620}px)`,
              }}
            >
              <div style={{ fontSize: 40, fontWeight: 500, letterSpacing: '-0.03em', color: mc.dashText }}>ChatGPT</div>
              <div style={{ fontSize: 18, color: mc.dashMuted, marginTop: 8 }}>Connected by ops@snapkit.dev</div>
              <div style={{ borderTop: `1px solid ${mc.dashLine}`, margin: '24px -30px 18px' }} />
              {[
                ['Last used', 'Just now'],
                ['Connected', 'Oct 20, 2026'],
                ['Customer details', 'Partly hidden'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', fontSize: 18, padding: '8px 0' }}>
                  <span style={{ width: 190, color: mc.dashMuted }}>{k}</span>
                  <span style={{ color: mc.dashText }}>{v}</span>
                </div>
              ))}
              <div style={{ borderTop: `1px solid ${mc.dashLine}`, margin: '18px 0' }} />
              <div style={{ fontSize: 20, color: mc.dashText }}>Can read</div>
              {['Read Balance', 'Read Payments', 'Read Payouts', 'Read Products', 'Read Subscriptions'].map((r, i) => (
                <div key={r} style={{ fontSize: 18, color: mc.dashText, padding: '6px 0', opacity: ease(frame, [cue.drawer + 6 + i * 2, cue.drawer + 10 + i * 2], [0, 1]) }}>
                  {r}
                </div>
              ))}
              <div
                style={{
                  position: 'absolute',
                  left: 30,
                  right: 30,
                  bottom: 30,
                  textAlign: 'center',
                  padding: '14px 0',
                  borderRadius: 12,
                  border: `1px solid ${hoverT > 0.5 ? '#e05a5a' : mc.dashLine}`,
                  color: hoverT > 0.5 ? '#c24040' : mc.dashText,
                  background: hoverT > 0.5 ? 'rgba(224,90,90,0.06)' : '#fff',
                  fontSize: 19,
                  fontWeight: 500,
                }}
              >
                Disconnect
              </div>
            </div>
          )}
        </div>
      </div>
      <Cursor
        appear={cue.apps + 10}
        keys={[
          { f: cue.apps + 10, x: 1000, y: 980 },
          { f: cue.rowClick - 3, x: 560, y: 812 },
          { f: cue.rowClick, x: 560, y: 812, click: true },
          { f: cue.hover + 8, x: 1540, y: 958 },
          { f: cue.names[0], x: 1560, y: 965 },
        ]}
      />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* Works where you work (bars 11–12), what it reads (bar 13)            */
/* ------------------------------------------------------------------ */

const clients = ['Claude', 'ChatGPT', 'Cursor', 'Grok'];
const readPairs = [
  ['Products', 'Payments'],
  ['Subscriptions', 'Balances'],
  ['Payouts', 'Docs'],
];

const WorksWith: React.FC = () => {
  const frame = useCurrentFrame();
  const out = ease(frame, [cue.reads[0] - 6, cue.reads[0] + 4], [0, 1]);
  const any = sp(frame, cue.anyClient, 18, 120);
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: 1 - out, transform: `translateY(${-out * 40}px)` }}>
      <div style={{ display: 'flex', gap: 28, marginTop: 40 }}>
        {clients.map((c, i) => {
          const s = sp(frame, cue.names[i], 12, 220);
          const on = frame >= cue.names[i];
          return (
            <div
              key={c}
              style={{
                width: 300,
                height: 150,
                borderRadius: 26,
                background: mc.card,
                border: `1px solid ${mc.line}`,
                boxShadow: '0 24px 60px rgba(41,25,99,0.16)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: fonts.sans,
                fontWeight: 620,
                fontSize: 52,
                letterSpacing: '-0.035em',
                color: mc.ink,
                opacity: on ? Math.min(1, s * 2) : 0,
                transform: `translateY(${(1 - s) * 60}px) scale(${0.85 + s * 0.15})`,
              }}
            >
              {c}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 48, fontFamily: fonts.mono, fontSize: 28, color: mc.muted, opacity: frame >= cue.anyClient ? any : 0, transform: `translateY(${(1 - any) * 12}px)` }}>
        and any MCP client
      </div>
    </AbsoluteFill>
  );
};

const Reads: React.FC = () => {
  const frame = useCurrentFrame();
  const out = ease(frame, [cue.end - 6, cue.end + 4], [0, 1]);
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: 1 - out, filter: `blur(${out * 8}px)` }}>
      <div style={{ fontFamily: fonts.mono, fontSize: 24, letterSpacing: '0.2em', color: mc.muted, marginBottom: 34, opacity: ease(frame, [cue.reads[0], cue.reads[0] + 6], [0, 1]) }}>
        ASK ABOUT YOUR
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 360px)', gap: 22 }}>
        {readPairs.flatMap((pair, i) =>
          pair.map((w, j) => {
            const s = sp(frame, cue.reads[i] + j * 3, 13, 220);
            return (
              <div
                key={w}
                style={{
                  gridColumn: i + 1,
                  gridRow: j + 1,
                  padding: '26px 0',
                  textAlign: 'center',
                  borderRadius: 20,
                  background: j ? mc.card : mc.deep,
                  color: j ? mc.deep : '#fff',
                  border: `1px solid ${j ? 'rgba(91,66,187,0.25)' : mc.deep}`,
                  fontFamily: fonts.sans,
                  fontWeight: 600,
                  fontSize: 46,
                  letterSpacing: '-0.03em',
                  opacity: frame >= cue.reads[i] + j * 3 ? Math.min(1, s * 2) : 0,
                  transform: `translateY(${(1 - s) * 40}px)`,
                }}
              >
                {w}
              </div>
            );
          }),
        )}
      </div>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* End (bars 14–16)                                                    */
/* ------------------------------------------------------------------ */

const End: React.FC = () => {
  const frame = useCurrentFrame();
  const a = sp(frame, cue.end, 18, 110);
  const pill = sp(frame, cue.urlPill, 15, 150);
  const portal = sp(frame, cue.portal, 18, 120);
  const mark = sp(frame, cue.mark, 9, 240);
  const markOn = frame >= cue.mark;
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ height: 120, display: 'flex', alignItems: 'center' }}>
          {markOn && <Img src={staticFile('brand/bachs-logo.svg')} style={{ width: 104, height: 104, transform: `scale(${1.6 - mark * 0.6})`, opacity: Math.min(1, mark * 2) }} />}
        </div>
        <div style={{ marginTop: 30, fontFamily: fonts.sans, fontWeight: 650, fontSize: 128, letterSpacing: '-0.05em', color: mc.ink, opacity: Math.min(1, a * 1.5), transform: `translateY(${(1 - a) * 30}px)` }}>
          Bachs <span style={{ color: mc.deep }}>MCP</span>
        </div>
        <div
          style={{
            marginTop: 36,
            padding: '20px 34px',
            borderRadius: 18,
            background: mc.ink,
            fontFamily: fonts.mono,
            fontSize: 36,
            color: '#f4f2fb',
            boxShadow: '0 30px 70px rgba(41,25,99,0.28)',
            opacity: Math.min(1, pill * 1.5),
            transform: `translateY(${(1 - pill) * 24}px)`,
          }}
        >
          {URL_TEXT}
        </div>
        <div style={{ marginTop: 30, fontFamily: fonts.sans, fontSize: 28, color: mc.muted, opacity: frame >= cue.portal ? portal : 0 }}>
          Developer Portal → Connected apps
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* Assembly                                                            */
/* ------------------------------------------------------------------ */

export const McpVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const switchT = interpolate(frame, [cue.switch, cue.switch + 6, cue.chatgpt - 4, cue.chatgpt + 4], [0, 1, 1, 0], clamp);
  return (
    <AbsoluteFill style={{ background: mc.bg }}>
      <style>{fontFaceCss}</style>
      <Backdrop />

      {frame < cue.connector + 4 && <Hook />}

      {frame >= cue.connector - 2 && frame < cue.switch + 16 && <ClaudeScene />}
      <Cap text="Connect once." from={cue.connector} to={cue.q1[0]} highlight={['once']} />
      <Cap text="Ask in plain English." from={cue.q1[0]} to={cue.switch} highlight={['plain', 'English']} />

      {/* The break: one line in the quiet bar. */}
      {switchT > 0 && (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: switchT }}>
          <Words
            text="Same account. Any assistant."
            delay={cue.switch + 2}
            stagger={3}
            highlight={['Any', 'assistant']}
            highlightColor={mc.deep}
            style={{ fontFamily: fonts.sans, fontWeight: 620, fontSize: 96, letterSpacing: '-0.045em', color: mc.ink }}
          />
        </AbsoluteFill>
      )}

      {frame >= cue.chatgpt - 2 && frame < cue.apps + 10 && <ChatGptScene />}
      <Cap text="Answers straight from Bachs." from={cue.chatgpt + 4} to={cue.apps} highlight={['straight', 'from', 'Bachs']} />

      {frame >= cue.apps - 2 && frame < cue.names[0] + 6 && <ConnectedApps />}
      <Cap text="See every connection. Disconnect any time." from={cue.apps} to={cue.names[0]} highlight={['Disconnect', 'any', 'time']} />

      {frame >= cue.names[0] - 2 && frame < cue.reads[0] + 6 && <WorksWith />}
      <Cap text="Works where you work." from={cue.names[0]} to={cue.reads[0]} highlight={['you', 'work']} />

      {frame >= cue.reads[0] - 2 && frame < cue.end + 6 && <Reads />}

      {frame >= cue.end - 2 && <End />}

      <AbsoluteFill style={{ background: mc.bg, opacity: ease(frame, [durationInFrames - 12, durationInFrames], [0, 1]) }} />
      <Audio src={staticFile('audio/mcp-mix.wav')} />
    </AbsoluteFill>
  );
};
