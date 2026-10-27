import React from 'react';
import { AbsoluteFill, Audio, Easing, Img, random, staticFile, useCurrentFrame } from 'remotion';
import { keyFrames } from '../mcplaunch/McpLaunch';
import { Backdrop, Foot, GROUND, Header, IO, k, Pixel, PixelWipe, Rise, Wall, type Ground } from '../mcppixel/McpPixel';
import { px } from '../mcpstyle/PixelFrames';
import { fontFaceCss, fonts } from '../theme';
import edit from './edit.json';

// Bachs MCP as one session, paced like a demo rather than a trailer: a
// merchant asks four plain questions, the reads tick off, the answer comes
// back, and after the first three the camera leaves the session for a
// picture of the answer. Only then the line and the logo. Same campaign
// language as the launch video (navy session, cobalt and paper answers,
// pixel wipes), on the bar lines of a slow build.

export const MCP_STORY_TOTAL = edit.total;

type Tool = { name: string; arg: string; res: string; at: number; done: number };
type Exchange = { at: number; q: string; a: string; typeFrom: number; typeTo: number; answerFrom: number; answerTo: number; tools: Tool[] };
type Scene = { at: number; g: string; kind: string; ex?: number; wrap?: boolean };
const EX = edit.exchanges as Exchange[];
const SCENES = edit.scenes as Scene[];

// ---------- the session ----------

const LEFT = 200;
const FOCUS_Y = 400; // where the current question sits on screen
const ZOOM = 1.2; // the session is read up close
const ANSWER_W = 1300;
const Q_H = 64;
const TOOL_H = 54;
const LINE_H = 58;
const GAP = 96;
const answerLines = (a: string) => Math.ceil(a.length / 52);
const blockHeight = (e: Exchange) => Q_H + 26 + e.tools.length * TOOL_H + 26 + answerLines(e.a) * LINE_H;
const TOPS = EX.reduce<number[]>((acc, e, i) => [...acc, i === 0 ? 0 : acc[i - 1] + blockHeight(EX[i - 1]) + GAP], []);
const CONTENT_H = TOPS[EX.length - 1] + blockHeight(EX[EX.length - 1]);

const Chip: React.FC<{ who: 'you' | 'ai' }> = ({ who }) => (
  <span style={{ display: 'inline-block', width: 72, textAlign: 'center', padding: '3px 0', marginRight: 26, borderRadius: 6, fontFamily: fonts.mono, fontSize: 26, verticalAlign: '0.25em', background: who === 'you' ? px.white : px.cobalt, color: who === 'you' ? px.navy : px.white }}>{who}</span>
);

const Block: React.FC<{ e: Exchange; dim: number }> = ({ e, dim }) => {
  const f = useCurrentFrame();
  if (f < e.at) return null;
  const typed = keyFrames(e.q, e.typeFrom, e.typeTo).filter((t) => f >= t).length;
  const typing = typed < e.q.length;
  const shown = Math.round(e.a.length * k(f, e.answerFrom, e.answerTo, Easing.linear));
  // stream the answer a word at a time
  const cut = shown >= e.a.length ? e.a.length : Math.max(0, e.a.lastIndexOf(' ', shown));
  return (
    <div style={{ opacity: dim }}>
      <div style={{ height: Q_H, display: 'flex', alignItems: 'center', fontFamily: fonts.sans, fontWeight: 500, fontSize: 48, letterSpacing: '-0.02em', color: px.white, opacity: k(f, e.at, e.at + 8) }}>
        <Chip who="you" />
        {e.q.slice(0, typed)}
        {typing && <span style={{ display: 'inline-block', width: 4, height: 46, marginLeft: 4, background: px.white, opacity: f % 16 < 10 ? 0.9 : 0.2 }} />}
      </div>
      <div style={{ marginTop: 26, marginLeft: 98 }}>
        {e.tools.map((t, i) => {
          const done = f >= t.done;
          const last = i === e.tools.length - 1;
          return (
            <div key={t.name} style={{ height: TOOL_H, display: 'flex', alignItems: 'center', fontFamily: fonts.mono, fontSize: 32, color: px.white, opacity: k(f, t.at, t.at + 6) }}>
              <span style={{ width: 52, color: 'rgba(169,198,255,0.45)' }}>{last ? '└' : '├'}</span>
              <span style={{ width: 52, color: done ? px.green : px.sky }}>{done ? '✓' : ['■', '□'][Math.floor(f / 4) % 2]}</span>
              <span style={{ width: 330 }}>{t.name}</span>
              <span style={{ width: 380, color: px.grey }}>{t.arg}</span>
              <span style={{ color: px.sky, opacity: k(f, t.done, t.done + 8) }}>{t.res}</span>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 26, width: ANSWER_W, fontFamily: fonts.sans, fontSize: 44, lineHeight: `${LINE_H}px`, letterSpacing: '-0.015em', color: 'rgba(255,255,255,0.92)', opacity: k(f, e.answerFrom, e.answerFrom + 6) }}>
        <Chip who="ai" />
        {e.a.slice(0, cut)}
      </div>
    </div>
  );
};

const Session: React.FC<{ sc: Scene; end: number }> = ({ sc, end }) => {
  const f = useCurrentFrame();
  const i = sc.ex ?? 0;
  const e = EX[i];
  // Focus: the current question held at FOCUS_Y while the camera eases in.
  const s0 = ZOOM * (1 + 0.035 * k(f, sc.at, end, IO));
  let s = s0;
  let tx = LEFT - s0 * LEFT;
  let ty = FOCUS_Y - s0 * TOPS[i];
  // The last session pulls back to show every question answered.
  const w = sc.wrap ? k(f, e.answerTo + 14, end - 6, IO) : 0;
  if (w > 0) {
    const sw = Math.min(0.62, 740 / CONTENT_H);
    const txw = 960 - sw * (LEFT + ANSWER_W / 2);
    const tyw = 190;
    s = s0 + (sw - s0) * w;
    tx = tx + (txw - tx) * w;
    ty = ty + (tyw - ty) * w;
  }
  return (
    <>
      <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, transformOrigin: '0 0', transform: `translate(${tx}px, ${ty}px) scale(${s})` }}>
        {EX.map((x, j) =>
          j > i ? null : (
            <div key={j} style={{ position: 'absolute', left: LEFT, top: TOPS[j], width: 1520 }}>
              <Block e={x} dim={j < i ? 0.38 + 0.62 * w : 1} />
            </div>
          ),
        )}
      </div>
      {/* the top of the frame stays clear for the header and the connection line */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 300, background: `linear-gradient(${px.navy} 72%, rgba(18,20,42,0))`, opacity: 1 - w }} />
      <div style={{ position: 'absolute', left: LEFT, top: 168, fontFamily: fonts.mono, fontSize: 26, color: 'rgba(169,198,255,0.6)', opacity: 1 - w }}>
        <span style={{ color: px.green }}>●</span> bachs connected · sandbox · read-only
      </div>
      {sc.wrap && (
        <Rise at={e.answerTo + 30} style={{ position: 'absolute', left: 0, right: 0, top: 986, textAlign: 'center', fontFamily: fonts.sans, fontSize: 36, color: 'rgba(255,255,255,0.8)' }}>
          Read-only. It can't move money or change anything.
        </Rise>
      )}
    </>
  );
};

// ---------- the answers, drawn ----------

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

const Money: React.FC<{ at: number }> = ({ at }) => {
  const f = useCurrentFrame();
  const count = k(f, at + 8, at + 44, Easing.bezier(0.2, 0.6, 0.2, 1));
  const COLS = 40;
  const ROWS = 6;
  const avail = 128;
  const settle = 31;
  const S = 31;
  const G = 9;
  return (
    <>
      <div style={{ position: 'absolute', left: 112, top: 240, display: 'flex', alignItems: 'baseline', color: px.white, opacity: k(f, at + 6, at + 14) }}>
        <span style={{ fontFamily: fonts.sans, fontSize: 140, marginRight: 10 }}>₦</span>
        <Pixel size={196} color={px.white}>
          {fmt(1284500 * count)}
        </Pixel>
      </div>
      <Rise at={at + 22} style={{ position: 'absolute', left: 120, top: 470, fontFamily: fonts.sans, fontSize: 52, letterSpacing: '-0.02em', color: px.white }}>
        available now, and ₦312,000 more lands tomorrow.
      </Rise>
      <div style={{ position: 'absolute', left: 120, top: 640, display: 'grid', gridTemplateColumns: `repeat(${COLS}, ${S}px)`, gap: G }}>
        {Array.from({ length: COLS * ROWS }, (_, i) => {
          const order = (i % COLS) * ROWS + Math.floor(i / COLS);
          const shown = f >= at + 26 + (order / (avail + settle)) * 44;
          const on = order < avail;
          const next = !on && order < avail + settle;
          return (
            <div
              key={i}
              style={{
                width: S,
                height: S,
                boxSizing: 'border-box',
                background: on && shown ? px.white : next && shown ? 'transparent' : px.cobaltLift,
                border: next && shown ? `3px solid ${px.white}` : undefined,
                boxShadow: on && shown ? '0 0 14px rgba(255,255,255,0.45)' : undefined,
              }}
            />
          );
        })}
      </div>
      <Foot g="cobalt">
        <span>Each square is ₦10,000.</span>
        <span>Sandbox, test data</span>
      </Foot>
    </>
  );
};

const Payout: React.FC<{ at: number }> = ({ at }) => (
  <>
    <Rise at={at + 6} style={{ position: 'absolute', left: 120, top: 220, display: 'flex', alignItems: 'center', gap: 16, fontFamily: fonts.mono, fontSize: 30, color: px.muted }}>
      <span style={{ width: 22, height: 22, background: px.red }} /> payout failed · Oct 25
    </Rise>
    <Rise at={at + 10} style={{ position: 'absolute', left: 112, top: 290 }}>
      <Pixel size={240} color={px.cobalt}>
        PO-20263
      </Pixel>
    </Rise>
    <Rise at={at + 24} style={{ position: 'absolute', left: 120, top: 580, width: 1450, fontFamily: fonts.sans, fontWeight: 500, fontSize: 68, lineHeight: 1.1, letterSpacing: '-0.03em', color: px.ink }}>
      The name on the bank account doesn't match your business name.
    </Rise>
    <Rise at={at + 36} style={{ position: 'absolute', left: 120, top: 830, fontFamily: fonts.mono, fontSize: 32, color: px.muted }}>
      ₦450,000.00 · GTBank •••• 4410
    </Rise>
    <Foot g="paper">
      <span>Payouts, and the plain reason one failed.</span>
      <span>Sandbox, test data</span>
    </Foot>
  </>
);

const Disputes: React.FC<{ at: number }> = ({ at }) => (
  <>
    <Rise at={at + 8} style={{ position: 'absolute', left: 112, top: 250 }}>
      <Pixel size={260} color={px.white}>
        3 days
      </Pixel>
    </Rise>
    <Rise at={at + 24} style={{ position: 'absolute', left: 120, top: 580, width: 1500, fontFamily: fonts.sans, fontSize: 60, lineHeight: 1.16, letterSpacing: '-0.02em', color: px.white }}>
      to respond to Tunde Bello's $120.00 dispute for “product not received”. Evidence is due Oct 30.
    </Rise>
    <Foot g="cobalt">
      <span>Deadlines and evidence, most urgent first.</span>
      <span>Sandbox, test data</span>
    </Foot>
  </>
);

// ---------- the line ----------

const KINDS = ['payments', 'payouts', 'balances', 'disputes', 'customers', 'subscriptions', 'invoices', 'refunds', 'webhooks', 'API logs', 'compliance', 'settlements', 'checkout sessions', 'payment links', 'docs'];
const SPOTS: [number, number][] = [
  [140, 170], [620, 120], [1180, 150], [1600, 220], [180, 330], [1440, 360],
  [120, 780], [560, 880], [1050, 820], [1500, 760], [260, 960], [1300, 960], [820, 1000], [1700, 900], [880, 230],
];

const Words: React.FC<{ at: number }> = ({ at }) => {
  const f = useCurrentFrame();
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, opacity: 0.8 }}>
        <Wall speed={(f - at) * 0.8} />
      </div>
      {KINDS.map((w, i) => {
        const [x, y] = SPOTS[i];
        const t0 = at + 4 + random(`kd${i}`) * 50;
        const drift = (f - at) * (0.25 + random(`kv${i}`) * 0.35);
        return (
          <div key={w} style={{ position: 'absolute', left: x, top: y - drift, display: 'flex', alignItems: 'center', gap: 12, fontFamily: fonts.mono, fontSize: 28, color: px.cobalt, opacity: 0.85 * k(f, t0, t0 + 14) }}>
            <span style={{ width: 14, height: 14, background: i % 3 === 0 ? px.cobalt : 'transparent', border: `3px solid ${px.cobalt}`, boxSizing: 'border-box' }} />
            {w}
          </div>
        );
      })}
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ padding: '30px 60px', background: px.paper, borderRadius: 24, textAlign: 'center' }}>
          <Rise at={at + 6} style={{ fontFamily: fonts.sans, fontWeight: 500, fontSize: 92, lineHeight: 1.05, letterSpacing: '-0.04em', color: px.ink }}>
            Almost everything in your dashboard,
          </Rise>
          <Rise at={at + 34} style={{ marginTop: 6, fontFamily: fonts.sans, fontWeight: 500, fontSize: 92, lineHeight: 1.05, letterSpacing: '-0.04em', color: px.cobalt }}>
            in a conversation.
          </Rise>
        </div>
      </AbsoluteFill>
    </>
  );
};

const Logo: React.FC<{ at: number }> = ({ at }) => {
  const f = useCurrentFrame();
  const t = k(f, at, at + 20);
  const out = k(f, edit.total - 24, edit.total, IO);
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: 1 - out }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 56, transform: `scale(${1.1 - 0.1 * t})`, opacity: t }}>
        <Img src={staticFile('brand/logo-white.png')} style={{ height: 96 }} />
        <Pixel size={190} color={px.white}>
          MCP
        </Pixel>
      </div>
      <Rise at={at + 26} style={{ marginTop: 60, fontFamily: fonts.sans, fontSize: 46, letterSpacing: '-0.015em', color: px.white }}>
        Ask about your account in Claude, ChatGPT and other apps that support MCP.
      </Rise>
      <Rise at={at + 46} style={{ marginTop: 26, fontFamily: fonts.mono, fontSize: 34, color: 'rgba(255,255,255,0.75)' }}>
        mcp.bachs.io/mcp
      </Rise>
    </AbsoluteFill>
  );
};

const LABEL: Record<string, string> = { money: 'Balances', payout: 'Payouts', disputes: 'Disputes', session: 'Bachs MCP', words: 'Bachs MCP' };

export const McpStory: React.FC = () => {
  const f = useCurrentFrame();
  const i = Math.max(0, SCENES.filter((s) => f >= s.at).length - 1);
  const sc = SCENES[i];
  const end = SCENES[i + 1]?.at ?? edit.total;
  const g = sc.g as Ground;
  const drift = sc.kind === 'session' ? 1 : 1 + 0.025 * k(f, sc.at, end, IO);
  return (
    <AbsoluteFill style={{ background: GROUND[g], overflow: 'hidden' }}>
      <style>{fontFaceCss}</style>
      <Backdrop g={g} />
      <AbsoluteFill style={{ transform: `scale(${drift})` }}>
        {sc.kind === 'session' && <Session sc={sc} end={end} />}
        {sc.kind === 'money' && <Money at={sc.at} />}
        {sc.kind === 'payout' && <Payout at={sc.at} />}
        {sc.kind === 'disputes' && <Disputes at={sc.at} />}
        {sc.kind === 'words' && <Words at={sc.at} />}
        {sc.kind === 'logo' && <Logo at={sc.at} />}
      </AbsoluteFill>
      {LABEL[sc.kind] && <Header g={g} label={LABEL[sc.kind]} />}
      {SCENES.slice(1).map((s) => (
        <PixelWipe key={s.at} at={s.at} color={GROUND[s.g as Ground]} />
      ))}
      <Audio src={staticFile('audio/mcpstory-mix.wav')} />
    </AbsoluteFill>
  );
};
