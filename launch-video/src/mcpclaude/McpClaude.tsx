import React from 'react';
import { AbsoluteFill, Audio, Easing, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { fontFaceCss, fonts } from '../theme';
import edit from './edit.json';

// Bachs MCP in Claude. Two windows on one canvas: Claude Code in a terminal for the
// developer's questions, then the Claude app, where a question comes back as a
// chart. The terminal follows captures of the real Claude Code (v2.1.312) calling
// the Bachs docs MCP server: the prompt bar, "Calling bachs…", the spinner, "Called
// bachs", the answer bullet and "Baked for". The camera only ever frames a whole
// window. Data is a fictional sandbox business.

export const MCP_CLAUDE_TOTAL = edit.total;

const IO = Easing.bezier(0.4, 0, 0.2, 1);
const OUT = Easing.bezier(0.05, 0.7, 0.1, 1);
const k = (f: number, a: number, z: number, easing = IO) => interpolate(f, [a, z], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing });

const page = { ground: '#eef0f5', ink: '#1c1d2b', muted: '#6b7084', cobalt: '#3672ea' };
// Claude Code's colours, read from the capture (xterm 256-colour indices in brackets).
const t = {
  bg: '#1d1d1f',
  bar: '#2b2b2e',
  text: '#e8e8e8',
  dim: '#949494', // 246
  faint: '#808080', // 244
  code: '#afd7ff', // 153
  salmon: '#d78787', // 174
  promptBg: '#3a3a3a', // 237
  green: '#5fd787',
  rule: '#4e4e4e',
};
// The Claude app, recreated in general terms; the chart follows Claude's chart cards.
const a = { bg: '#faf9f5', bar: '#f3f1ea', ink: '#29261b', muted: '#7a776b', line: '#e6e3d8', bubble: '#efece3', blue: '#4b7bec' };

type CC = (typeof edit.cc)[number];
const typed = (keys: number[], f: number) => keys.filter((x) => f >= x).length;

// ---------- the camera: whole windows only ----------

type Shot = 'all' | 'terminal' | 'app';
const WIN = { terminal: { x: 70, y: 120, w: 900, h: 800 }, app: { x: 1010, y: 120, w: 840, h: 800 } };
const fit = (s: Shot) => {
  if (s === 'all') return { x: 960, y: 520, sc: 1 };
  const w = WIN[s];
  return { x: w.x + w.w / 2, y: w.y + w.h / 2, sc: Math.min(1740 / w.w, 890 / w.h) };
};
const camera = (f: number) => {
  const S = edit.shots as [number, Shot][];
  let i = 0;
  while (i < S.length - 1 && f >= S[i + 1][0]) i++;
  const [fa, sa] = S[i];
  const [fb, sb] = S[Math.min(i + 1, S.length - 1)];
  const p = fb === fa ? 1 : k(f, fa, fb);
  const A = fit(sa);
  const B = fit(sb);
  const m = (x: number, y: number) => x + (y - x) * p;
  // the window out of focus fades out entirely, so nothing is ever seen half-cropped
  const lit = (s: Shot, w: 'terminal' | 'app') => (s === 'all' || s === w ? 1 : 0);
  return {
    transform: `translate(${960 - m(A.x, B.x) * m(A.sc, B.sc)}px, ${505 - m(A.y, B.y) * m(A.sc, B.sc)}px) scale(${m(A.sc, B.sc)})`,
    op: (w: 'terminal' | 'app') => m(lit(sa, w), lit(sb, w)),
  };
};

// ---------- Claude Code ----------

// Inline `code` in an answer is drawn in Claude Code's light blue.
const Rich: React.FC<{ text: string }> = ({ text }) => (
  <>
    {text.split(/(`[^`]*`)/).map((s, i) =>
      s.startsWith('`') ? (
        <span key={i} style={{ color: t.code }}>{s.slice(1, -1)}</span>
      ) : (
        <span key={i}>{s}</span>
      ),
    )}
  </>
);
// Reveal answer text over a span of frames, keeping `code` spans intact.
const reveal = (text: string, n: number) => {
  let out = '';
  let shown = 0;
  let inCode = false;
  for (const ch of text) {
    if (ch === '`') {
      inCode = !inCode;
      out += ch;
      continue;
    }
    if (shown >= n) break;
    out += ch;
    shown++;
  }
  return inCode ? out + '`' : out;
};
const plainLen = (s: string) => s.replace(/`/g, '').length;

const ANSWERS = [
  'Yes, since 09:12. 6 of the last 58 deliveries to `https://lumencourses.com/api/webhooks` failed: your endpoint returned `500` for each `collection.succeeded` event. Everything before 09:12 arrived.',
  '`POST /v1/checkout-sessions` at 08:41 was rejected: `product_cart[0].product_id` `prod_9fK2xQ` wasn’t found in your sandbox account.',
];
const SPIN = ['✢', '✳', '✶', '✻', '✽', '✻', '✶', '✳'];
const VERBS = ['Pondering…', 'Simmering…'];

const Exchange: React.FC<{ x: CC; i: number }> = ({ x, i }) => {
  const f = useCurrentFrame();
  if (f < x.enter) return null;
  const n = Math.round(plainLen(ANSWERS[i]) * k(f, x.answer[0], x.answer[1], Easing.linear));
  const secs = Math.max(1, Math.round((Math.min(f, x.called) - x.calling) / 30));
  return (
    <div style={{ marginTop: 20 }}>
      <div>
        <span style={{ background: t.promptBg, padding: '1px 0' }}>
          <span style={{ color: t.dim }}>❯ </span>
          {x.q}
        </span>
      </div>
      <div style={{ marginTop: 16, paddingLeft: 26, color: f < x.called ? t.text : t.dim }}>{f < x.called ? 'Calling bachs…' : 'Called bachs'}</div>
      {f >= x.answer[0] && (
        <div style={{ marginTop: 16, display: 'flex' }}>
          <span style={{ width: 26, flex: 'none' }}>●</span>
          <span style={{ whiteSpace: 'pre-wrap' }}>
            <Rich text={reveal(ANSWERS[i], n)} />
          </span>
        </div>
      )}
      {f >= x.baked && <div style={{ marginTop: 16, color: t.dim }}>✻ Baked for {3 + i}s</div>}
      {f >= x.calling && f < x.called && (
        <div style={{ marginTop: 16, color: t.salmon }}>
          {SPIN[Math.floor(f / 4) % SPIN.length]} {VERBS[i]} <span style={{ color: t.dim }}>({secs}s · ↓ {40 + (f - x.calling) * 3} tokens)</span>
        </div>
      )}
    </div>
  );
};

const Terminal: React.FC = () => {
  const f = useCurrentFrame();
  const CCS = edit.cc as CC[];
  // the question being typed sits in the input box until Enter
  const cur = CCS.find((x) => f >= x.start - 10 && f < x.enter);
  const n = cur ? typed(cur.keys, f) : 0;
  const busy = CCS.some((x) => f >= x.calling && f < x.baked);
  return (
    <div style={{ position: 'absolute', left: WIN.terminal.x, top: WIN.terminal.y, width: WIN.terminal.w, height: WIN.terminal.h, background: t.bg, borderRadius: 16, overflow: 'hidden', boxShadow: '0 30px 80px rgba(20,24,50,0.25)' }}>
      <div style={{ height: 44, background: t.bar, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fonts.mono, fontSize: 15, color: t.dim }}>lumen-courses — claude</div>
      <div style={{ padding: '22px 26px', fontFamily: fonts.mono, fontSize: 21, lineHeight: '29px', color: t.text }}>
        <div style={{ display: 'flex', gap: 22, alignItems: 'flex-start' }}>
          {/* the mascot exactly as the CLI prints it, block characters on a black ground for the eyes */}
          <div style={{ color: t.salmon, whiteSpace: 'pre', lineHeight: '24px', fontFamily: "'DejaVu Sans Mono', monospace" }}>
            <div>
              {' ▐'}
              <span style={{ background: '#000000' }}>▛███▛█</span>
            </div>
            <div>
              {'▝▜'}
              <span style={{ background: '#000000' }}>█████</span>
              {'█▀'}
            </div>
            <div>{' ▝▝   ▝▝'}</div>
          </div>
          <div>
            <div>
              <b>Claude Code</b> <span style={{ color: t.dim }}>v2.1.312</span>
            </div>
            <div style={{ color: t.dim }}>~/lumen-courses</div>
          </div>
        </div>
        {CCS.map((x, i) => (
          <Exchange key={i} x={x} i={i} />
        ))}
      </div>
      <div style={{ position: 'absolute', left: 26, right: 26, bottom: 56, borderTop: `1px solid ${t.rule}`, borderBottom: `1px solid ${t.rule}`, padding: '10px 0', fontFamily: fonts.mono, fontSize: 21, color: t.text }}>
        <span style={{ color: t.dim }}>❯ </span>
        {cur ? cur.q.slice(0, n) : ''}
        {!busy && <span style={{ display: 'inline-block', width: 12, height: 24, verticalAlign: '-4px', background: t.text, opacity: f % 18 < 11 ? 0.85 : 0.15 }} />}
      </div>
      <div style={{ position: 'absolute', left: 40, bottom: 20, fontFamily: fonts.mono, fontSize: 17, color: t.dim }}>{busy ? 'esc to interrupt' : '? for shortcuts'}</div>
    </div>
  );
};

// ---------- the Claude app ----------

const DAYS = [
  { d: 'Wed 28', v: 412600 },
  { d: 'Thu 29', v: 538900 },
  { d: 'Fri 30', v: 295400 },
  { d: 'Mon 2', v: 764250 },
  { d: 'Tue 3', v: 351800 },
];
const ngnK = (v: number) => (v >= 1000 ? `₦${Math.round(v / 1000)}K` : `₦${v}`);

const Chart: React.FC = () => {
  const f = useCurrentFrame();
  const A = edit.app;
  const grow = k(f, A.chart[0], A.chart[1], OUT);
  const W = 640;
  const H = 300;
  const max = 800000;
  const bw = 70;
  const gap = (W - 60 - DAYS.length * bw) / DAYS.length;
  return (
    <div style={{ marginTop: 18, background: '#ffffff', border: `1px solid ${a.line}`, borderRadius: 14, padding: '20px 24px 16px', opacity: grow, transform: `translateY(${(1 - grow) * 16}px)` }}>
      <div style={{ fontSize: 20, fontWeight: 600, color: a.ink }}>Settling by day · NGN</div>
      <div style={{ fontSize: 14, color: a.muted, marginTop: 2 }}>Next five working days · sandbox test data</div>
      <svg width={W} height={H + 40} style={{ marginTop: 14, display: 'block' }}>
        {[0, 200000, 400000, 600000, 800000].map((g) => {
          const y = H - (g / max) * H + 6;
          return (
            <g key={g}>
              <line x1={60} x2={W} y1={y} y2={y} stroke="#eceae2" strokeWidth={1} />
              <text x={52} y={y + 5} textAnchor="end" fontSize={13} fill={a.muted} fontFamily="Geist, sans-serif">{ngnK(g)}</text>
            </g>
          );
        })}
        {DAYS.map((d, i) => {
          const at = edit.app.bars[0] + i * 9;
          const p = k(f, at, at + 34, OUT);
          const h = (d.v / max) * H * p;
          const x = 60 + gap / 2 + i * (bw + gap);
          const top = d.v === Math.max(...DAYS.map((x) => x.v));
          return (
            <g key={d.d}>
              <rect x={x} y={H + 6 - h} width={bw} height={h} rx={5} fill={a.blue} opacity={top ? 1 : 0.55} />
              <text x={x + bw / 2} y={H + 6 - h - 8} textAnchor="middle" fontSize={14} fill={a.ink} opacity={k(f, at + 24, at + 34)} fontFamily="Geist, sans-serif">₦{d.v.toLocaleString('en-US')}</text>
              <text x={x + bw / 2} y={H + 30} textAnchor="middle" fontSize={14} fill={a.muted} fontFamily="Geist, sans-serif">{d.d}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

const App: React.FC = () => {
  const f = useCurrentFrame();
  const A = edit.app;
  const n = typed(A.keys, f);
  const sent = f >= A.send;
  const answer = 'Monday, Nov 2 is your biggest day, with ₦764,250 settling. The rest of the week is between ₦295,400 and ₦538,900 a day.';
  const shown = Math.round(answer.length * k(f, A.answer[0], A.answer[1], Easing.linear));
  return (
    <div style={{ position: 'absolute', left: WIN.app.x, top: WIN.app.y, width: WIN.app.w, height: WIN.app.h, background: a.bg, borderRadius: 16, overflow: 'hidden', boxShadow: '0 30px 80px rgba(20,24,50,0.18)', border: `1px solid ${a.line}`, fontFamily: fonts.sans, color: a.ink }}>
      <div style={{ height: 52, background: a.bar, borderBottom: `1px solid ${a.line}`, display: 'flex', alignItems: 'center', padding: '0 22px', fontSize: 17, fontWeight: 500 }}>
        Claude
        <span style={{ marginLeft: 'auto', fontSize: 14, color: a.muted, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: 4, background: '#3aa76d' }} /> Bachs connected
        </span>
      </div>
      <div style={{ padding: '26px 34px', fontSize: 20, lineHeight: 1.5 }}>
        {sent && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', opacity: k(f, A.send, A.send + 8) }}>
            <div style={{ background: a.bubble, borderRadius: 18, padding: '12px 18px', maxWidth: 560 }}>{A.q}</div>
          </div>
        )}
        {f >= A.calling && (
          <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 10, fontSize: 16, color: a.muted }}>
            <span style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${a.muted}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>B</span>
            {f < A.called ? <span style={{ opacity: 0.6 + 0.4 * Math.sin(f / 4) }}>Calling Bachs…</span> : <span>Called Bachs ›</span>}
          </div>
        )}
        {f >= A.chart[0] && <Chart />}
        {f >= A.answer[0] && <div style={{ marginTop: 16 }}>{answer.slice(0, shown)}</div>}
      </div>
      <div style={{ position: 'absolute', left: 26, right: 26, bottom: 22, minHeight: 64, borderRadius: 18, background: '#ffffff', border: `1px solid ${a.line}`, display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', fontSize: 18 }}>
        <span style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${a.line}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: a.muted }}>+</span>
        <span style={{ padding: '4px 10px', borderRadius: 8, background: a.bar, fontSize: 14, color: a.muted }}>Bachs</span>
        <span style={{ color: !sent && n ? a.ink : a.muted }}>{!sent && n ? A.q.slice(0, n) : 'Reply to Claude…'}</span>
      </div>
    </div>
  );
};

// ---------- captions and end card ----------

const CAPS = [
  { at: 40, until: 500, text: 'Ask Claude Code about your integration.' },
  { at: 520, until: 850, text: 'Ask in the Claude app, and get the answer as a chart.' },
];
const Captions: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <>
      {CAPS.map((c) => {
        const o = k(f, c.at, c.at + 12, OUT) * (1 - k(f, c.until - 10, c.until));
        if (o <= 0) return null;
        return (
          <div key={c.at} style={{ position: 'absolute', left: 0, right: 0, top: 968, textAlign: 'center', fontFamily: fonts.sans, fontSize: 36, fontWeight: 500, letterSpacing: '-0.02em', color: page.ink, opacity: o }}>
            {c.text}
          </div>
        );
      })}
      <div style={{ position: 'absolute', right: 60, top: 40, fontFamily: fonts.sans, fontSize: 18, color: page.muted, opacity: k(f, 0, 20) * (1 - k(f, edit.endAt - 20, edit.endAt)) }}>Lumen Courses · sandbox test data</div>
    </>
  );
};

const EndCard: React.FC = () => {
  const f = useCurrentFrame();
  const e = edit.endAt;
  if (f < e - 4) return null;
  const p = k(f, e, e + 22, OUT);
  const out = k(f, edit.total - 22, edit.total);
  const rise = (d: number) => ({ opacity: k(f, e + d, e + d + 14, OUT), transform: `translateY(${(1 - k(f, e + d, e + d + 14, OUT)) * 14}px)` });
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', fontFamily: fonts.sans, color: page.ink, opacity: 1 - out, textAlign: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 32, opacity: p, transform: `scale(${0.92 + 0.08 * p})` }}>
        <Img src={staticFile('brand/logo-black.png')} style={{ height: 68 }} />
        <span style={{ fontSize: 94, fontWeight: 500, letterSpacing: '-0.03em', color: page.cobalt }}>MCP</span>
      </div>
      <div style={{ marginTop: 40, fontSize: 48, fontWeight: 500, letterSpacing: '-0.025em', ...rise(14) }}>Ask about your account in Claude.</div>
      <div style={{ marginTop: 18, fontSize: 27, color: page.muted, ...rise(26) }}>Works in Claude, ChatGPT and other apps that support MCP. Read-only.</div>
      <div style={{ marginTop: 24, fontFamily: fonts.mono, fontSize: 28, color: page.cobalt, ...rise(38) }}>mcp.bachs.io/mcp</div>
    </AbsoluteFill>
  );
};

export const McpClaude: React.FC = () => {
  const f = useCurrentFrame();
  const cam = camera(f);
  const leave = k(f, edit.endAt - 20, edit.endAt + 4);
  const enter = k(f, 0, 22, OUT);
  return (
    <AbsoluteFill style={{ background: page.ground, overflow: 'hidden' }}>
      <style>{fontFaceCss}</style>
      <AbsoluteFill style={{ opacity: (1 - leave) * enter, filter: leave > 0 ? `blur(${leave * 5}px)` : undefined }}>
        <AbsoluteFill style={{ transformOrigin: '0 0', transform: cam.transform }}>
          <div style={{ opacity: cam.op('terminal') }}>
            <Terminal />
          </div>
          <div style={{ opacity: cam.op('app') }}>
            <App />
          </div>
        </AbsoluteFill>
        <Captions />
      </AbsoluteFill>
      <EndCard />
      <Audio src={staticFile('audio/mcpclaude-mix.wav')} />
    </AbsoluteFill>
  );
};
