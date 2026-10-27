import React from 'react';
import { AbsoluteFill, Audio, Easing, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { Cursor, Grain } from '../components';
import { fontFaceCss, fonts } from '../theme';
import edit from './edit.json';

// Bachs MCP announcement: connect in a minute, ask in plain words, safe by
// design. Motion follows one personality throughout (calm, premium): a single
// on-screen curve, entrances that decelerate, exits that accelerate and run
// shorter, scenes that overlap as they hand over, and a slow ambient glow.

export const MCP_LAUNCH_TOTAL = edit.total;
const S = edit.scenes;

export const c = {
  bg: '#09090b',
  fg: '#f4f4f6',
  accent: '#7a87ff',
  muted: '#8b8c99',
  ink: '#18181d',
  sub: '#6b6c78',
  line: 'rgba(17,17,24,0.08)',
  soft: '#f4f4f8',
  sandbox: '#a8590b',
  sandboxBg: '#fff3e2',
  ok: '#1f8a4c',
  okBg: '#e7f6ee',
  bad: '#c2412d',
  badBg: '#fdecea',
};

const IO = Easing.bezier(0.4, 0, 0.2, 1); // the signature curve, for anything moving on screen
const OUT = Easing.bezier(0.05, 0.7, 0.1, 1); // entrances: fast start, gentle landing
const IN = Easing.bezier(0.3, 0, 1, 1); // exits: gentle start, quick departure
const ENTER = 20;
const EXIT = 14; // exits run shorter than entrances

const k = (f: number, a: number, b: number, easing = IO) => interpolate(f, [a, b], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing });

// Typing cadence: a pause at spaces and punctuation. The audio script uses the same formula.
export const keyFrames = (text: string, from: number, to: number) => {
  const w = [...text].map((ch) => (ch === ' ' ? 1.7 : '.,?/:'.includes(ch) ? 1.3 : 1));
  const total = w.reduce((a, b) => a + b, 0);
  let cum = 0;
  return w.map((x) => {
    cum += x;
    return from + ((to - from) * cum) / total;
  });
};
const typed = (text: string, frames: number[], f: number) => text.slice(0, frames.filter((t) => f >= t).length);

// ---------- building blocks ----------

const Ambient: React.FC = () => {
  const f = useCurrentFrame();
  const x = 50 + Math.sin(f / 140) * 14;
  const y = 38 + Math.cos(f / 170) * 10;
  return <AbsoluteFill style={{ background: `radial-gradient(55% 48% at ${x}% ${y}%, rgba(122,135,255,0.10), rgba(122,135,255,0) 70%), ${c.bg}` }} />;
};

// A scene enters by rising into place out of a blur and leaves by lifting away; the next scene overlaps its exit.
const Scene: React.FC<{ from: number; to: number; children: React.ReactNode }> = ({ from, to, children }) => {
  const f = useCurrentFrame();
  if (f < from || f > to + EXIT) return null;
  const inK = k(f, from, from + ENTER, OUT);
  const outK = k(f, to, to + EXIT, IN);
  return (
    <AbsoluteFill style={{ opacity: inK * (1 - outK), transform: `translateY(${(1 - inK) * 34 - outK * 26}px)`, filter: `blur(${(1 - inK) * 10 + outK * 8}px)` }}>
      {children}
    </AbsoluteFill>
  );
};

// Two-part headline: each part rises out of a mask, the second in the accent colour.
const Title: React.FC<{ words: string[]; at: number; size: number; style?: React.CSSProperties }> = ({ words, at, size, style }) => {
  const f = useCurrentFrame();
  return (
    <div style={{ display: 'flex', justifyContent: 'center', columnGap: '0.24em', fontFamily: fonts.sans, fontWeight: 600, fontSize: size, letterSpacing: '-0.045em', lineHeight: 1.12, whiteSpace: 'nowrap', ...style }}>
      {words.map((w, i) => {
        const t = k(f, at + i * 5, at + i * 5 + 18, OUT);
        return (
          <span key={i} style={{ display: 'inline-block', overflow: 'hidden', paddingBottom: '0.1em' }}>
            <span style={{ display: 'inline-block', color: i === 0 ? c.fg : c.accent, transform: `translateY(${(1 - t) * 100}%)` }}>{w}</span>
          </span>
        );
      })}
    </div>
  );
};

const Rise: React.FC<{ at: number; children: React.ReactNode; style?: React.CSSProperties; dist?: number }> = ({ at, children, style, dist = 14 }) => {
  const f = useCurrentFrame();
  const t = k(f, at, at + 16, OUT);
  return <div style={{ opacity: t, transform: `translateY(${(1 - t) * dist}px)`, filter: `blur(${(1 - t) * 6}px)`, ...style }}>{children}</div>;
};

// A white card that changes size between steps; the old content blurs out before the new blurs in.
const MorphCard: React.FC<{ at: number[]; sizes: number[][]; children: (i: number) => React.ReactNode }> = ({ at, sizes, children }) => {
  const f = useCurrentFrame();
  const i = Math.max(0, at.filter((a) => f >= a).length - 1);
  const m = i === 0 ? 1 : k(f, at[i], at[i] + 18);
  const [w0, h0] = sizes[Math.max(0, i - 1)];
  const [w1, h1] = sizes[i];
  const w = w0 + (w1 - w0) * m;
  const h = h0 + (h1 - h0) * m;
  return (
    <div style={{ position: 'relative', width: w, height: h, borderRadius: 22, overflow: 'hidden', background: '#fff', boxShadow: '0 50px 120px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)' }}>
      {at.map((a, j) => {
        const next = at[j + 1] ?? Infinity;
        if (f < a || f >= next + 10) return null;
        const inK = j === 0 ? 1 : k(f, a + 4, a + 16, OUT);
        const outK = next === Infinity ? 0 : k(f, next, next + 8, IN);
        const [cw, ch] = sizes[j];
        return (
          <div key={j} style={{ position: 'absolute', left: (w - cw) / 2, top: (h - ch) / 2, width: cw, height: ch, opacity: inK * (1 - outK), filter: `blur(${(1 - inK) * 8 + outK * 8}px)` }}>
            {children(j)}
          </div>
        );
      })}
    </div>
  );
};

const Button: React.FC<{ children: React.ReactNode; primary?: boolean; pressed?: number; style?: React.CSSProperties }> = ({ children, primary, pressed = 0, style }) => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: 46,
      padding: '0 22px',
      borderRadius: 12,
      fontFamily: fonts.sans,
      fontWeight: 500,
      fontSize: 20,
      background: primary ? c.ink : '#fff',
      color: primary ? '#fff' : c.ink,
      border: primary ? 'none' : `1px solid ${c.line}`,
      transform: `scale(${1 - pressed * 0.05})`,
      ...style,
    }}
  >
    {children}
  </div>
);

const press = (f: number, at: number) => interpolate(f, [at - 2, at + 3, at + 12], [0, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

export const Badge: React.FC<{ children: React.ReactNode; tone?: 'sandbox' | 'ok' | 'bad' | 'plain' }> = ({ children, tone = 'plain' }) => {
  const col = { sandbox: [c.sandbox, c.sandboxBg], ok: [c.ok, c.okBg], bad: [c.bad, c.badBg], plain: [c.sub, c.soft] }[tone];
  return <span style={{ display: 'inline-flex', alignItems: 'center', height: 28, padding: '0 11px', borderRadius: 999, fontFamily: fonts.sans, fontWeight: 500, fontSize: 16, color: col[0], background: col[1] }}>{children}</span>;
};

export const Check: React.FC<{ color?: string; size?: number }> = ({ color = c.ok, size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Wordmark: React.FC<{ height: number; sub?: boolean }> = ({ height }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: height * 0.42 }}>
    <Img src={staticFile('brand/logo-white.png')} style={{ height }} />
    <div style={{ width: 2, height: height * 1.05, background: 'rgba(255,255,255,0.22)' }} />
    <div style={{ fontFamily: fonts.sans, fontWeight: 500, fontSize: height * 1.36, lineHeight: 1, letterSpacing: '0.04em', color: c.accent, marginTop: -height * 0.06 }}>MCP</div>
  </div>
);

// ---------- 1. hook ----------

const Hook: React.FC = () => {
  const f = useCurrentFrame();
  const { text, from, to } = edit.typing;
  const keys = keyFrames(text, from, to);
  const shown = typed(text, keys, f);
  const send = press(f, to + 22);
  const caret = Math.floor(f / 15) % 2 === 0 || (f >= from && f <= to) ? 1 : 0;
  return (
    <Scene from={S.hook} to={S.title - EXIT}>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Title words={['Ask your business', 'in plain words.']} at={14} size={112} style={{ transform: 'translateY(-90px)' }} />
        <Rise at={64} style={{ position: 'absolute', top: 640 }}>
          <div style={{ width: 920, height: 80, borderRadius: 40, background: '#141419', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', padding: '0 14px 0 34px', boxShadow: '0 30px 80px rgba(0,0,0,0.45)' }}>
            <div style={{ flex: 1, fontFamily: fonts.sans, fontSize: 30, color: shown ? c.fg : '#5d5e6a' }}>
              {shown || 'Ask anything'}
              {shown && <span style={{ display: 'inline-block', width: 2, height: 32, marginLeft: 3, verticalAlign: '-5px', background: c.fg, opacity: caret }} />}
            </div>
            <div style={{ width: 52, height: 52, borderRadius: 26, background: shown.length === text.length ? c.accent : '#2a2a33', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${1 - send * 0.12})` }}>
              <svg width="22" height="22" viewBox="0 0 24 24">
                <path d="M12 19V5M5.5 11.5L12 5l6.5 6.5" fill="none" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </Rise>
      </AbsoluteFill>
    </Scene>
  );
};

// ---------- 2. title ----------

const TitleCard: React.FC = () => {
  const f = useCurrentFrame();
  const hit = k(f, S.title, S.title + 30, OUT);
  return (
    <Scene from={S.title} to={S.connect - 6}>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ transform: `scale(${0.94 + hit * 0.06})`, filter: `blur(${(1 - hit) * 10}px)`, opacity: hit }}>
          <Wordmark height={78} />
        </div>
        <Rise at={S.title + 30} style={{ marginTop: 46, fontFamily: fonts.sans, fontSize: 34, color: c.muted }}>
          for Claude, ChatGPT and other apps that support MCP
        </Rise>
      </AbsoluteFill>
    </Scene>
  );
};

// ---------- 3. connect ----------

export const ConnectedApps: React.FC<{ at: number }> = ({ at }) => {
  const f = useCurrentFrame();
  const click = at + 44;
  const copied = f >= click + 2;
  const Row: React.FC<{ label: React.ReactNode; url: string; copy?: boolean }> = ({ label, url, copy }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '18px 22px', borderTop: `1px solid ${c.line}` }}>
      <div style={{ width: 170, fontFamily: fonts.sans, fontSize: 20, color: c.ink, display: 'flex', alignItems: 'center', gap: 10 }}>{label}</div>
      <div style={{ flex: 1, fontFamily: fonts.mono, fontSize: 19, color: c.sub }}>{url}</div>
      <Button pressed={copy ? press(f, click) : 0} style={{ width: 118, height: 40, fontSize: 18, ...(copy && copied ? { color: c.ok, borderColor: '#bfe5cf' } : {}) }}>
        {copy && copied ? 'Copied' : 'Copy'}
      </Button>
    </div>
  );
  return (
    <div style={{ position: 'absolute', inset: 0, padding: '34px 44px', fontFamily: fonts.sans }}>
      <div style={{ fontSize: 17, color: c.sub }}>Developers › Connected apps</div>
      <div style={{ marginTop: 10, fontSize: 36, fontWeight: 600, letterSpacing: '-0.02em', color: c.ink }}>Connected apps</div>
      <div style={{ marginTop: 8, fontSize: 20, color: c.sub }}>Let AI apps read your Bachs account. They can't move money or change anything.</div>
      <div style={{ marginTop: 28, border: `1px solid ${c.line}`, borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '14px 22px', fontSize: 17, fontWeight: 500, color: c.sub, background: c.soft }}>Connector links</div>
        <Row label="Live" url="https://mcp.bachs.io/mcp" />
        <Row label={<>Sandbox <Badge tone="sandbox">test</Badge></>} url="https://mcp.bachs.io/sandbox/mcp" copy />
      </div>
      <div style={{ marginTop: 26, fontSize: 18, color: c.sub }}>No apps connected yet.</div>
      <Cursor appear={at + 6} keys={[{ f: at + 6, x: 640, y: 470 }, { f: at + 36, x: 962, y: 337 }, { f: click, x: 962, y: 337, click: true }, { f: at + 80, x: 962, y: 337 }]} />
    </div>
  );
};

export const AddConnector: React.FC<{ at: number }> = ({ at }) => {
  const f = useCurrentFrame();
  const pasted = f >= at + 18;
  const click = at + 58;
  const Field: React.FC<{ label: string; value: string; active?: boolean }> = ({ label, value, active }) => (
    <div style={{ marginTop: 22 }}>
      <div style={{ fontSize: 18, color: c.sub }}>{label}</div>
      <div style={{ marginTop: 8, height: 52, borderRadius: 12, border: `1.5px solid ${active ? c.accent : c.line}`, display: 'flex', alignItems: 'center', padding: '0 16px', fontFamily: fonts.mono, fontSize: 19, color: c.ink }}>{value}</div>
    </div>
  );
  return (
    <div style={{ position: 'absolute', inset: 0, padding: '34px 40px', fontFamily: fonts.sans }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 17, color: c.sub }}>
        <span style={{ width: 10, height: 10, borderRadius: 5, background: '#d97757' }} /> Claude · Settings › Connectors
      </div>
      <div style={{ marginTop: 12, fontSize: 32, fontWeight: 600, letterSpacing: '-0.02em', color: c.ink }}>Add custom connector</div>
      <Field label="Name" value="Bachs" />
      <Field label="Remote MCP server URL" value={pasted ? 'https://mcp.bachs.io/sandbox/mcp' : ''} active={!pasted || f < at + 40} />
      <div style={{ position: 'absolute', right: 40, bottom: 34, display: 'flex', gap: 12 }}>
        <Button>Cancel</Button>
        <Button primary pressed={press(f, click)}>
          Add
        </Button>
      </div>
      <Cursor appear={at + 8} keys={[{ f: at + 8, x: 470, y: 300 }, { f: at + 48, x: 798, y: 451 }, { f: click, x: 798, y: 451, click: true }, { f: at + 80, x: 798, y: 451 }]} />
    </div>
  );
};

export const AllowPage: React.FC<{ at: number }> = ({ at }) => {
  const f = useCurrentFrame();
  const click = at + 50;
  const done = k(f, click + 6, click + 20, OUT);
  const groups = ['Payments and customers', 'Money movement', 'Account and compliance', 'Developer'];
  return (
    <div style={{ position: 'absolute', inset: 0, padding: '36px 44px', fontFamily: fonts.sans }}>
      <Img src={staticFile('brand/logo-black.png')} style={{ height: 22 }} />
      <div style={{ marginTop: 22, fontSize: 31, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.2, color: c.ink }}>Claude wants to read your Bachs account</div>
      <div style={{ marginTop: 12, display: 'flex', gap: 10 }}>
        <Badge>SnapKit</Badge>
        <Badge tone="sandbox">Sandbox</Badge>
      </div>
      <div style={{ marginTop: 22, fontSize: 18, color: c.sub }}>It will be able to read:</div>
      {groups.map((g, i) => (
        <Rise key={g} at={at + 10 + i * 3} dist={8} style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12, fontSize: 21, color: c.ink }}>
          <Check /> {g}
        </Rise>
      ))}
      <div style={{ marginTop: 22, padding: '14px 18px', borderRadius: 12, background: c.soft, fontSize: 18, lineHeight: 1.4, color: c.sub }}>Read-only. It can't create, change, refund, pay out or delete anything.</div>
      <div style={{ position: 'absolute', right: 44, bottom: 34, display: 'flex', gap: 12 }}>
        <Button>Cancel</Button>
        <Button primary pressed={press(f, click)} style={{ background: done > 0 ? c.ok : c.ink, minWidth: 120 }}>
          {done > 0 ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: done }}>
              <Check color="#fff" size={20} /> Allowed
            </span>
          ) : (
            'Allow'
          )}
        </Button>
      </div>
      <Cursor appear={at + 8} keys={[{ f: at + 8, x: 380, y: 360 }, { f: at + 42, x: 652, y: 606 }, { f: click, x: 652, y: 606, click: true }, { f: at + 80, x: 652, y: 606 }]} />
    </div>
  );
};

const Connect: React.FC = () => {
  const f = useCurrentFrame();
  const at = edit.connectSteps;
  const step = Math.max(0, at.filter((a) => f >= a).length - 1);
  const labels = ['Copy your connector link', 'Add it to your AI app', 'Sign in and allow. No API key to paste.'];
  return (
    <Scene from={S.connect} to={S.ask - 6}>
      <Title words={['Connected in', 'about a minute.']} at={S.connect + 4} size={64} style={{ position: 'absolute', top: 70, left: 0, right: 0 }} />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 30 }}>
        <MorphCard at={at} sizes={[[1100, 520], [880, 520], [760, 650]]}>
          {(i) => (i === 0 ? <ConnectedApps at={at[0]} /> : i === 1 ? <AddConnector at={at[1]} /> : <AllowPage at={at[2]} />)}
        </MorphCard>
      </AbsoluteFill>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 985, display: 'flex', justifyContent: 'center' }}>
        {labels.map((l, i) => {
          const inK = k(f, at[i] + 6, at[i] + 20, OUT);
          const outK = i < 2 ? k(f, at[i + 1], at[i + 1] + 8, IN) : 0;
          if (inK <= 0 || outK >= 1) return null;
          return (
            <div key={l} style={{ position: 'absolute', display: 'flex', alignItems: 'center', gap: 14, fontFamily: fonts.sans, fontSize: 28, color: c.fg, opacity: inK * (1 - outK), transform: `translateY(${(1 - inK) * 10 - outK * 8}px)` }}>
              <span style={{ width: 36, height: 36, borderRadius: 18, border: '1px solid rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: c.muted }}>{i + 1}</span>
              {l}
            </div>
          );
        })}
      </div>
    </Scene>
  );
};

// ---------- 4. ask ----------

export const AREAS = ['Find anything', 'Payments', 'Customers and billing', 'Money and payouts', 'Disputes and risk', 'Account and compliance', 'Platforms', 'Developers', 'Bachs docs'];

const Row: React.FC<{ cells: React.ReactNode[]; head?: boolean }> = ({ cells, head }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1.2fr', padding: '11px 18px', borderTop: head ? 'none' : `1px solid ${c.line}`, fontSize: head ? 19 : 25, color: head ? c.sub : c.ink, fontWeight: head ? 500 : 400 }}>
    {cells.map((x, i) => (
      <div key={i} style={{ textAlign: i === 0 ? 'left' : 'right' }}>{x}</div>
    ))}
  </div>
);

const Detail: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderRadius: 14, background: c.soft, fontSize: 23, color: c.ink }}>{children}</div>
);

export type Q = { ask: string; tool: string; area: number; h: number; answer: React.ReactNode };
export const QS: Q[] = [
  {
    ask: 'How much money do I have, and what settles tomorrow?',
    tool: 'balances',
    area: 3,
    h: 430,
    answer: (
      <>
        <div>Here are your balances:</div>
        <div style={{ marginTop: 10, border: `1px solid ${c.line}`, borderRadius: 12, overflow: 'hidden' }}>
          <Row head cells={['Currency', 'Available', 'Settling tomorrow']} />
          <Row cells={['USD', '$4,212.40', '$860.00']} />
          <Row cells={['NGN', '₦1,284,500.00', '₦312,000.00']} />
        </div>
      </>
    ),
  },
  {
    ask: "Find Ada Obi's payment. Did it go through?",
    tool: 'search',
    area: 0,
    h: 370,
    answer: (
      <>
        <div>No. Her $29.00 payment on Oct 26 was declined by her bank for insufficient funds.</div>
        <Detail>
          <span style={{ fontFamily: fonts.mono, fontSize: 21 }}>Visa •••• 0019</span>
          <span style={{ color: c.sub }}>Oct 26, 14:02</span>
          <span style={{ marginLeft: 'auto' }}>
            <Badge tone="bad">Failed</Badge>
          </span>
        </Detail>
      </>
    ),
  },
  {
    ask: 'Do I have disputes I need to respond to?',
    tool: 'disputes',
    area: 4,
    h: 370,
    answer: (
      <>
        <div>One is due soon: $120.00 from Tunde Bello, for “product not received”.</div>
        <Detail>
          <span>Evidence due</span>
          <span style={{ fontWeight: 600 }}>Oct 30</span>
          <span style={{ marginLeft: 'auto' }}>
            <Badge tone="sandbox">in 3 days</Badge>
          </span>
        </Detail>
      </>
    ),
  },
  {
    ask: 'Why did my last payout fail?',
    tool: 'payouts',
    area: 3,
    h: 370,
    answer: (
      <>
        <div>The ₦450,000.00 payout on Oct 25 failed: the name on the bank account doesn't match your business name.</div>
        <Detail>
          <span style={{ fontFamily: fonts.mono, fontSize: 21 }}>GTBank •••• 4410</span>
          <span style={{ marginLeft: 'auto' }}>
            <Badge tone="bad">Name mismatch</Badge>
          </span>
        </Detail>
      </>
    ),
  },
  {
    ask: 'Are my webhooks failing?',
    tool: 'webhook deliveries',
    area: 7,
    h: 370,
    answer: (
      <>
        <div>Yes, since 09:12 today. Your endpoint returned 500 for 3 checkout.completed events. The 40 before that were delivered.</div>
        <Detail>
          <span style={{ fontFamily: fonts.mono, fontSize: 21 }}>checkout.completed</span>
          <span style={{ marginLeft: 'auto' }}>
            <Badge tone="bad">3 failed · HTTP 500</Badge>
          </span>
        </Detail>
      </>
    ),
  },
];

const Group: React.FC<{ q: Q; at: number }> = ({ q, at }) => {
  const f = useCurrentFrame();
  const sent = at + 30;
  const chipIn = k(f, sent + 8, sent + 20, OUT);
  const done = f >= sent + 26;
  const spin = (f * 12) % 360;
  const ansIn = k(f, sent + 28, sent + 48, OUT);
  return (
    <div style={{ height: q.h, padding: '0 34px' }}>
      <Rise at={sent} dist={18} style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ maxWidth: 780, padding: '15px 24px', borderRadius: 20, background: '#efeff5', fontSize: 27, color: c.ink }}>{q.ask}</div>
      </Rise>
      <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 10, opacity: chipIn, transform: `translateY(${(1 - chipIn) * 8}px)` }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 36, padding: '0 16px', borderRadius: 999, border: `1px solid ${c.line}`, fontFamily: fonts.mono, fontSize: 19, color: c.sub }}>
          {done ? <Check size={18} color={c.accent} /> : <span style={{ width: 12, height: 12, borderRadius: 6, border: `2px solid ${c.accent}`, borderTopColor: 'transparent', transform: `rotate(${spin}deg)` }} />}
          Bachs · {q.tool}
        </span>
      </div>
      <div style={{ marginTop: 14, opacity: ansIn, transform: `translateY(${(1 - ansIn) * 12}px)`, filter: `blur(${(1 - ansIn) * 5}px)`, fontSize: 27, lineHeight: 1.42, color: c.ink }}>
        <div style={{ marginBottom: 8 }}>
          <Badge tone="sandbox">Test data</Badge>
        </div>
        {q.answer}
      </div>
    </div>
  );
};

const Ask: React.FC = () => {
  const f = useCurrentFrame();
  const qs = edit.askQs;
  const cur = Math.max(0, qs.filter((a) => f >= a).length - 1);
  // Scroll: when a question is sent, the previous exchange glides up out of view.
  const scroll = QS.reduce((acc, q, i) => (i === 0 ? acc : acc + QS[i - 1].h * k(f, qs[i] + 26, qs[i] + 48)), 0);
  const typingFrames = keyFrames(QS[cur].ask, qs[cur] + 2, qs[cur] + 24);
  const draft = f < qs[cur] + 30 ? typed(QS[cur].ask, typingFrames, f) : '';
  const sentIdx = Math.max(0, qs.filter((q) => f >= q + 30).length - 1); // the list follows the question once it is sent
  const area = QS[sentIdx].area;
  return (
    <Scene from={S.ask} to={S.trust - 8}>
      <Title words={['Then', 'just ask.']} at={S.ask + 4} size={64} style={{ position: 'absolute', top: 70, left: 0, right: 0 }} />
      <Rise at={S.ask + 18} style={{ position: 'absolute', left: 150, top: 300, fontFamily: fonts.sans }}>
        <div style={{ fontFamily: fonts.mono, fontSize: 17, letterSpacing: '0.12em', color: c.muted, marginBottom: 20 }}>IT READS</div>
        {AREAS.map((a, i) => {
          const on = AREAS[area] === a && f >= qs[0] + 30;
          return (
            <div key={a} style={{ display: 'flex', alignItems: 'center', gap: 14, height: 50, fontSize: 25, color: on ? c.fg : '#5b5c68', transition: 'none' }}>
              <span style={{ width: 8, height: 8, borderRadius: 4, background: on ? c.accent : 'transparent', border: on ? 'none' : '1px solid #3a3a44' }} />
              {a}
            </div>
          );
        })}
      </Rise>
      <div style={{ position: 'absolute', left: 640, top: 190, width: 1130, height: 800, borderRadius: 22, background: '#fff', overflow: 'hidden', boxShadow: '0 50px 120px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)', fontFamily: fonts.sans }}>
        <div style={{ height: 62, display: 'flex', alignItems: 'center', gap: 12, padding: '0 26px', borderBottom: `1px solid ${c.line}` }}>
          <span style={{ width: 11, height: 11, borderRadius: 6, background: '#d97757' }} />
          <span style={{ fontSize: 21, fontWeight: 600, color: c.ink }}>Claude</span>
          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, fontSize: 17, color: c.sub }}>
            Connected: Bachs <Badge tone="sandbox">Sandbox</Badge>
          </span>
        </div>
        <div style={{ position: 'absolute', top: 62, left: 0, right: 0, bottom: 100, overflow: 'hidden' }}>
          <div style={{ paddingTop: 30, transform: `translateY(${-scroll}px)` }}>
            {QS.map((q, i) => (f >= qs[i] + 28 ? <Group key={i} q={q} at={qs[i]} /> : null))}
          </div>
        </div>
        <div style={{ position: 'absolute', left: 26, right: 26, bottom: 24, height: 60, borderRadius: 16, border: `1px solid ${c.line}`, display: 'flex', alignItems: 'center', padding: '0 20px', fontSize: 25, color: draft ? c.ink : '#a3a4ae' }}>
          {draft || 'Reply to Claude…'}
          {draft && <span style={{ width: 2, height: 24, marginLeft: 2, background: c.ink }} />}
        </div>
      </div>
    </Scene>
  );
};

// ---------- 5. trust ----------

const TrustVignette: React.FC<{ i: number; at: number }> = ({ i, at }) => {
  const f = useCurrentFrame();
  const pad: React.CSSProperties = { position: 'absolute', inset: 0, padding: '30px 34px', fontFamily: fonts.sans, color: c.ink };
  if (i === 0) {
    return (
      <div style={pad}>
        {['balances', 'payments', 'payouts', 'webhook deliveries'].map((t, j) => (
          <Rise key={t} at={at + 10 + j * 4} dist={8} style={{ display: 'flex', alignItems: 'center', gap: 14, height: 66, borderBottom: j < 3 ? `1px solid ${c.line}` : 'none' }}>
            <span style={{ fontFamily: fonts.mono, fontSize: 19, color: c.sub }}>Bachs · {t}</span>
            <span style={{ marginLeft: 'auto' }}>
              <Badge tone="ok">read</Badge>
            </span>
          </Rise>
        ))}
        <div style={{ marginTop: 18, fontSize: 18, color: c.sub }}>Every call is a read, and the key behind it is read-only too.</div>
      </div>
    );
  }
  if (i === 1) {
    const click = at + 64;
    const off = f >= click + 4;
    return (
      <div style={pad}>
        <div style={{ fontSize: 16, color: c.sub }}>Developers › Connected apps</div>
        <div style={{ marginTop: 8, fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em' }}>Connected apps</div>
        <div style={{ marginTop: 22, border: `1px solid ${c.line}`, borderRadius: 14, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ width: 40, height: 40, borderRadius: 10, background: '#f6e7e1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ width: 12, height: 12, borderRadius: 6, background: '#d97757' }} />
          </span>
          <div>
            <div style={{ fontSize: 21, fontWeight: 500 }}>Claude</div>
            <div style={{ marginTop: 2, fontSize: 16, color: c.sub }}>{off ? 'Access stopped' : 'Connected today · reads 4 groups'}</div>
          </div>
          <span style={{ marginLeft: 'auto' }}>
            {off ? (
              <Badge>Disconnected</Badge>
            ) : (
              <Button pressed={press(f, click)} style={{ height: 40, fontSize: 18, color: c.bad }}>
                Disconnect
              </Button>
            )}
          </span>
        </div>
        <Cursor appear={at + 14} keys={[{ f: at + 14, x: 300, y: 300 }, { f: at + 54, x: 470, y: 162 }, { f: click, x: 470, y: 162, click: true }, { f: at + 110, x: 470, y: 162 }]} />
      </div>
    );
  }
  if (i === 2) {
    const rows: [string, string][] = [
      ['Card', 'Visa •••• 0019'],
      ['Bank account', 'GTBank •••• 4410'],
      ['Mobile money', 'MTN MoMo •••• 7731'],
      ['Webhook signing secret', 'never shown'],
    ];
    return (
      <div style={pad}>
        {rows.map(([a, b], j) => (
          <Rise key={a} at={at + 10 + j * 4} dist={8} style={{ display: 'flex', alignItems: 'center', height: 66, borderBottom: j < 3 ? `1px solid ${c.line}` : 'none' }}>
            <span style={{ fontSize: 20, color: c.sub }}>{a}</span>
            <span style={{ marginLeft: 'auto', fontFamily: fonts.mono, fontSize: 20, color: j === 3 ? c.sub : c.ink }}>{b}</span>
          </Rise>
        ))}
      </div>
    );
  }
  return (
    <div style={{ ...pad, fontSize: 21, lineHeight: 1.45 }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 30, padding: '0 12px', borderRadius: 999, border: `1px solid ${c.line}`, fontFamily: fonts.mono, fontSize: 15, color: c.sub }}>
        <Check size={15} color={c.accent} /> Bachs · balances
      </span>
      <div style={{ marginTop: 16, transform: `scale(${1 + press(f, at + 30) * 0.06})`, transformOrigin: 'left center', display: 'inline-block' }}>
        <Badge tone="sandbox">Test data</Badge>
      </div>
      <div style={{ marginTop: 10 }}>Your sandbox balance is $4,212.40 available, with $860.00 settling tomorrow.</div>
    </div>
  );
};

const TRUST = [
  ['Read-only.', "It can't create, change, refund, pay out or delete anything."],
  ['You choose,', 'and you can take it back. See what an app can read before you allow it, and disconnect it at any time.'],
  ['Card and bank numbers', 'stay hidden. Only the last 4 digits are shown, and secrets never are.'],
  ['Sandbox', 'says so. Every sandbox answer is marked as test data.'],
];

const Trust: React.FC = () => {
  const f = useCurrentFrame();
  const at = edit.trustPoints;
  return (
    <Scene from={S.trust} to={S.areas - 8}>
      <Rise at={S.trust + 4} style={{ position: 'absolute', left: 170, top: 250, fontFamily: fonts.mono, fontSize: 18, letterSpacing: '0.12em', color: c.muted }}>
        SAFE BY DESIGN
      </Rise>
      {TRUST.map(([a, b], i) => {
        const next = at[i + 1] ?? S.areas;
        if (f < at[i] || f > next + 10) return null;
        const outK = i < TRUST.length - 1 ? k(f, next - 4, next + 8, IN) : 0;
        return (
          <div key={a} style={{ position: 'absolute', left: 170, top: 300, width: 760, opacity: 1 - outK, transform: `translateY(${-outK * 20}px)`, filter: `blur(${outK * 8}px)` }}>
            <Title words={[a]} at={at[i] + 2} size={72} style={{ justifyContent: 'flex-start' }} />
            <Rise at={at[i] + 14} style={{ marginTop: 18, fontFamily: fonts.sans, fontSize: 32, lineHeight: 1.4, color: c.muted }}>
              {b}
            </Rise>
          </div>
        );
      })}
      <div style={{ position: 'absolute', left: 1010, top: 250, width: 740, height: 560, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <MorphCard at={at} sizes={[[680, 400], [680, 260], [680, 360], [680, 260]]}>
          {(i) => <TrustVignette i={i} at={at[i]} />}
        </MorphCard>
      </div>
    </Scene>
  );
};

// ---------- 6. coverage, 7. works with, 8. logo ----------

const EXAMPLES = [
  "“Find Ada Obi's payment.”",
  '“Which payments failed this week?”',
  '“Show my open invoices.”',
  '“How much is settling tomorrow?”',
  '“How healthy are my payments?”',
  "“Why can't I get paid out?”",
  '“Show my latest transfers.”',
  '“Why did my API call fail?”',
  '“How do I create a checkout session?”',
];

const Areas: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Scene from={S.areas} to={S.works - 8}>
      <Title words={['9 areas.', '53 kinds of record.']} at={S.areas + 2} size={84} style={{ position: 'absolute', top: 96, left: 0, right: 0 }} />
      <div style={{ position: 'absolute', left: 180, top: 280, width: 1560, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
        {AREAS.map((a, i) => {
          const t = k(f, S.areas + 14 + i * 2, S.areas + 34 + i * 2, OUT);
          return (
            <div key={a} style={{ height: 150, borderRadius: 18, padding: '24px 26px', background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(255,255,255,0.09)', opacity: t, transform: `translateY(${(1 - t) * 16}px)` }}>
              <div style={{ fontFamily: fonts.sans, fontWeight: 600, fontSize: 28, color: c.fg }}>{a}</div>
              <div style={{ marginTop: 10, fontFamily: fonts.sans, fontSize: 21, color: c.muted }}>{EXAMPLES[i]}</div>
            </div>
          );
        })}
      </div>
      <Rise at={S.areas + 110} style={{ position: 'absolute', left: 0, right: 0, top: 830, textAlign: 'center', fontFamily: fonts.sans, fontSize: 32, color: c.fg }}>
        In our tests, Claude answered all 20 merchant questions correctly.
      </Rise>
      <Rise at={S.areas + 124} style={{ position: 'absolute', left: 0, right: 0, top: 884, textAlign: 'center', fontFamily: fonts.sans, fontSize: 26, color: c.muted }}>
        Usually in one step. Live and sandbox, side by side.
      </Rise>
    </Scene>
  );
};

const Works: React.FC = () => (
  <Scene from={S.works} to={S.logo - 10}>
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Rise at={S.works + 4} style={{ fontFamily: fonts.sans, fontSize: 34, color: c.muted }}>
        Works with
      </Rise>
      <div style={{ marginTop: 28, display: 'flex', gap: 18 }}>
        {['Claude', 'ChatGPT'].map((n, i) => (
          <Rise key={n} at={S.works + 10 + i * 4} style={{ padding: '16px 34px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.05)', fontFamily: fonts.sans, fontWeight: 500, fontSize: 46, color: c.fg }}>
            {n}
          </Rise>
        ))}
      </div>
      <Rise at={S.works + 26} style={{ marginTop: 30, fontFamily: fonts.sans, fontSize: 34, color: c.muted }}>
        and other apps that support MCP
      </Rise>
    </AbsoluteFill>
  </Scene>
);

const Logo: React.FC = () => {
  const f = useCurrentFrame();
  const hit = k(f, S.logo, S.logo + 26, OUT);
  const out = k(f, edit.total - 20, edit.total, IN);
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: f < S.logo ? 0 : 1 - out }}>
      <div style={{ transform: `scale(${0.95 + hit * 0.05})`, filter: `blur(${(1 - hit) * 10}px)`, opacity: hit }}>
        <Wordmark height={70} />
      </div>
      <Rise at={S.logo + 22} style={{ marginTop: 44, fontFamily: fonts.mono, fontSize: 26, letterSpacing: '0.02em', color: c.muted }}>
        Dashboard › Developers › Connected apps
      </Rise>
    </AbsoluteFill>
  );
};

export const McpLaunch: React.FC = () => (
  <AbsoluteFill style={{ background: c.bg }}>
    <style>{fontFaceCss}</style>
    <Ambient />
    <Hook />
    <TitleCard />
    <Connect />
    <Ask />
    <Trust />
    <Areas />
    <Works />
    <Logo />
    <Grain />
    <Audio src={staticFile('audio/mcplaunch-mix.wav')} />
  </AbsoluteFill>
);
