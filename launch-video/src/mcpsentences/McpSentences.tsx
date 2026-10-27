import React, { createContext, useCallback, useContext, useLayoutEffect, useRef, useState } from 'react';
import { AbsoluteFill, Audio, continueRender, delayRender, Easing, Img, interpolate, random, staticFile, useCurrentFrame } from 'remotion';
import { fontFaceCss, fonts } from '../theme';
import edit from './edit.json';

// Bachs MCP, "Into sentences". A busy finance dashboard for a fictional bakery.
// A question is asked from an AI app; only the cells that answer it light up,
// lift out and travel into one plain sentence while the rest of the screen
// dissolves. The sentence's letters then scatter as the next screen builds.
// One take: no cuts, and the last sentence gathers into the end card.

export const MCP_SENTENCES_TOTAL = edit.total;

const c = {
  ground: '#f4f5f8',
  panel: '#ffffff',
  line: '#e4e6ee',
  ink: '#1c1d2b',
  muted: '#6b7084',
  faint: '#9aa0b4',
  cobalt: '#3672ea',
  tint: 'rgba(54,114,234,0.10)',
  red: '#d4483b',
  green: '#1f9d62',
  amber: '#b7791f',
};

const IO = Easing.bezier(0.4, 0, 0.2, 1);
const OUT = Easing.bezier(0.05, 0.7, 0.1, 1);
const k = (f: number, a: number, z: number, easing = IO) => interpolate(f, [a, z], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing });

type Beat = (typeof edit.beats)[number];
const BEATS = edit.beats as Beat[];

// Keystroke frames: a pause at spaces and punctuation (the same weights as scripts/plan_mcpsentences.py).
const keyFrames = (text: string, from: number, to: number) => {
  const w = [...text].map((ch) => (ch === ' ' ? 1.7 : ".,?/:'".includes(ch) ? 1.3 : 1));
  const total = w.reduce((a, b) => a + b, 0);
  let cum = 0;
  return w.map((x) => {
    cum += x;
    return from + ((to - from) * cum) / total;
  });
};

// ---------- measuring: where each answer cell sits, and where its word lands ----------

type Rect = { x: number; y: number; w: number; h: number; fs: number; text: string };
type Registry = { reg: (id: string, fs: number) => (el: HTMLElement | null) => void; rects: Map<string, Rect> | null };
const Reg = createContext<Registry>({ reg: () => () => undefined, rects: null });

const relRect = (el: HTMLElement, root: HTMLElement) => {
  let x = 0;
  let y = 0;
  let e: HTMLElement | null = el;
  while (e && e !== root) {
    x += e.offsetLeft;
    y += e.offsetTop;
    e = e.offsetParent as HTMLElement | null;
  }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight };
};

// ---------- the story ----------

type Tok = { t: string; src?: string; accent?: boolean };
type Sentence = { size: number; top: number; toks: Tok[]; light: string[] };

const SENTENCES: Sentence[] = [
  {
    size: 84,
    top: 330,
    toks: [{ t: '₦486,200', src: 'fri.net', accent: true }, { t: 'settles' }, { t: 'on' }, { t: 'Friday,', src: 'fri.date' }, { t: 'across' }, { t: '37', src: 'fri.count', accent: true }, { t: 'payments.' }],
    light: ['fri.gross', 'fri.fees', 'fri.status'],
  },
  {
    size: 66,
    top: 270,
    toks: [
      { t: '4 failed.', src: 'pay.failedCount', accent: true },
      ...'2 cards were declined for'.split(' ').map((t) => ({ t })),
      { t: 'insufficient funds,', src: 'pay.r1' },
      ...'1 card had'.split(' ').map((t) => ({ t })),
      { t: 'expired,', src: 'pay.r3' },
      ...'and 1 customer didn’t finish'.split(' ').map((t) => ({ t })),
      { t: '3-D Secure.', src: 'pay.r4' },
    ],
    light: ['pay.s1', 'pay.s2', 'pay.s3', 'pay.s4', 'pay.r2'],
  },
  {
    size: 80,
    top: 310,
    toks: [{ t: 'One.', src: 'dis.count', accent: true }, { t: 'Femi Adebayo’s', src: 'dis.name' }, { t: '₦45,000', src: 'dis.amount', accent: true }, { t: 'dispute' }, { t: 'needs' }, { t: 'evidence' }, { t: 'by' }, { t: 'Nov 3.', src: 'dis.due', accent: true }],
    light: ['dis.reason', 'dis.status'],
  },
  {
    size: 84,
    top: 330,
    toks: [{ t: 'Proof of address', src: 'acc.poa', accent: true }, { t: 'is' }, { t: 'still' }, { t: 'needed.' }, { t: 'Everything' }, { t: 'else' }, { t: 'is' }, { t: 'approved.', src: 'acc.ok' }],
    light: ['acc.req'],
  },
];

// ---------- the dashboard ----------

// A registered cell: its text is what lifts out when it answers the question.
const Cell: React.FC<{ id?: string; fs?: number; style?: React.CSSProperties; children: React.ReactNode; screen: number }> = ({ id, fs = 16, style, children, screen }) => {
  const f = useCurrentFrame();
  const { reg } = useContext(Reg);
  const b = BEATS[screen];
  const s = SENTENCES[screen];
  const isSrc = !!id && s.toks.some((t) => t.src === id);
  const isLit = !!id && (isSrc || s.light.includes(id));
  const lit = isLit ? k(f, b.light, b.light + 8) : 0;
  const gone = isSrc && f >= b.lift;
  return (
    <span ref={id ? reg(id, fs) : undefined} style={{ display: 'inline-block', fontSize: fs, borderRadius: 4, padding: '0 4px', margin: '0 -4px', background: `rgba(54,114,234,${0.13 * lit})`, color: lit > 0 ? (isSrc ? c.cobalt : undefined) : undefined, opacity: gone ? 0 : 1, ...style }}>
      {children}
    </span>
  );
};

// Rows build in one after another when their screen arrives.
const Build: React.FC<{ screen: number; i: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ screen, i, children, style }) => {
  const f = useCurrentFrame();
  const start = screen === 0 ? 0 : BEATS[screen].at - 6;
  const t = k(f, start + i * 2, start + i * 2 + 16, OUT);
  return <div style={{ opacity: t, transform: `translateY(${(1 - t) * 18}px)`, ...style }}>{children}</div>;
};

const NAV = ['Home', 'Balances', 'Payments', 'Customers', 'Payouts', 'Disputes', 'Developers', 'Settings'];

const Shell: React.FC<{ screen: number; nav: string; title: string; children: React.ReactNode }> = ({ screen, nav, title, children }) => (
  <AbsoluteFill style={{ background: c.ground, fontFamily: fonts.sans, color: c.ink }}>
    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 260, background: c.panel, borderRight: `1px solid ${c.line}`, padding: '34px 22px', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40 }}>
        <div style={{ width: 36, height: 36, borderRadius: 9, background: '#f0e2cf', color: '#8a5a24', fontWeight: 600, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>T</div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 500 }}>Tolu’s Ovens</div>
          <div style={{ fontSize: 13, color: c.muted }}>Lagos</div>
        </div>
      </div>
      {NAV.map((n) => (
        <div key={n} style={{ padding: '10px 14px', borderRadius: 8, fontSize: 16, marginBottom: 2, background: n === nav ? c.ground : 'transparent', color: n === nav ? c.ink : c.muted, fontWeight: n === nav ? 500 : 400 }}>
          {n}
        </div>
      ))}
    </div>
    <div style={{ position: 'absolute', left: 300, right: 60, top: 36 }}>
      <Build screen={screen} i={0} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 26 }}>
        <div style={{ fontSize: 30, fontWeight: 500, letterSpacing: '-0.02em' }}>{title}</div>
        <div style={{ display: 'flex', gap: 10, fontSize: 14 }}>
          <span style={{ padding: '7px 12px', borderRadius: 999, border: `1px solid ${c.cobalt}`, color: c.cobalt }}>Sandbox · test data</span>
          <span style={{ padding: '7px 12px', borderRadius: 999, background: c.panel, border: `1px solid ${c.line}`, color: c.muted }}>Oct 27, 2026</span>
        </div>
      </Build>
      {children}
    </div>
  </AbsoluteFill>
);

const Panel: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ background: c.panel, border: `1px solid ${c.line}`, borderRadius: 14, ...style }}>{children}</div>
);

const Chip: React.FC<{ children: React.ReactNode; on?: boolean }> = ({ children, on }) => (
  <span style={{ padding: '6px 12px', borderRadius: 999, fontSize: 14, border: `1px solid ${on ? c.ink : c.line}`, background: on ? c.ink : c.panel, color: on ? c.panel : c.muted }}>{children}</span>
);

const Status: React.FC<{ s: string; children?: React.ReactNode }> = ({ s, children }) => {
  const col = /Failed|Needs|Required/.test(s) ? c.red : /Succeeded|Approved|Won|Scheduled/.test(s) ? c.green : /review|Pending/.test(s) ? c.amber : c.muted;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: col }}>
      <span style={{ width: 7, height: 7, borderRadius: 4, background: col }} />
      {children ?? s}
    </span>
  );
};

// A grid table: header plus rows, every cell optionally registered.
type Col = { h: string; w: string; align?: 'right' };
const Table: React.FC<{ screen: number; cols: Col[]; rows: { id?: string; cells: React.ReactNode[] }[]; from: number }> = ({ screen, cols, rows, from }) => {
  const tpl = cols.map((x) => x.w).join(' ');
  return (
    <Panel style={{ overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: tpl, columnGap: 28, padding: '14px 24px', fontSize: 13, letterSpacing: '0.04em', textTransform: 'uppercase', color: c.faint, borderBottom: `1px solid ${c.line}` }}>
        {cols.map((x) => (
          <div key={x.h} style={{ textAlign: x.align }}>{x.h}</div>
        ))}
      </div>
      {rows.map((r, i) => (
        <Build key={i} screen={screen} i={from + i}>
          <div style={{ display: 'grid', gridTemplateColumns: tpl, columnGap: 28, padding: '0 24px', height: 50, alignItems: 'center', fontSize: 16, borderBottom: i < rows.length - 1 ? `1px solid ${c.line}` : undefined, fontVariantNumeric: 'tabular-nums' }}>
            {r.cells.map((cell, j) => (
              <div key={j} style={{ textAlign: cols[j].align, whiteSpace: 'nowrap', overflow: 'hidden' }}>{cell}</div>
            ))}
          </div>
        </Build>
      ))}
    </Panel>
  );
};

const Stat: React.FC<{ label: string; children: React.ReactNode; sub?: string }> = ({ label, children, sub }) => (
  <Panel style={{ padding: '20px 24px', flex: 1 }}>
    <div style={{ fontSize: 14, color: c.muted }}>{label}</div>
    <div style={{ fontSize: 30, fontWeight: 500, letterSpacing: '-0.02em', marginTop: 8, fontVariantNumeric: 'tabular-nums' }}>{children}</div>
    {sub && <div style={{ fontSize: 13, color: c.faint, marginTop: 6 }}>{sub}</div>}
  </Panel>
);

const Balances: React.FC = () => {
  const S = 0;
  const rows: [string, string, string, string, string, string][] = [
    ['Wed, Oct 28', '52', '₦712,300.00', '₦10,684.50', '₦701,615.50', 'Scheduled'],
    ['Thu, Oct 29', '41', '₦598,900.00', '₦8,983.50', '₦589,916.50', 'Scheduled'],
    ['Fri, Oct 30', '37', '₦493,600.00', '₦7,400.00', '₦486,200.00', 'Scheduled'],
    ['Mon, Nov 2', '63', '₦842,750.00', '₦12,641.25', '₦830,108.75', 'Scheduled'],
    ['Tue, Nov 3', '29', '₦401,200.00', '₦6,018.00', '₦395,182.00', 'Scheduled'],
    ['Wed, Nov 4', '18', '₦264,900.00', '₦3,973.50', '₦260,926.50', 'Scheduled'],
  ];
  return (
    <Shell screen={S} nav="Balances" title="Balances">
      <Build screen={S} i={1} style={{ display: 'flex', gap: 18, marginBottom: 26 }}>
        <Stat label="NGN available" sub="Ready to pay out">₦2,214,750.00</Stat>
        <Stat label="NGN pending" sub="Settling over the next 7 days">₦3,263,950.25</Stat>
        <Stat label="USD available" sub="Ready to pay out">$3,140.00</Stat>
        <Stat label="Next payout" sub="To Access Bank •••• 2210">Wed, Oct 28</Stat>
      </Build>
      <Build screen={S} i={2} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ fontSize: 20, fontWeight: 500, marginRight: 12 }}>Upcoming settlements</span>
        <Chip on>Currency: NGN</Chip>
        <Chip>Next 7 days</Chip>
        <Chip>All methods</Chip>
      </Build>
      <Table
        screen={S}
        from={3}
        cols={[{ h: 'Date', w: '1.2fr' }, { h: 'Payments', w: '0.8fr', align: 'right' }, { h: 'Gross', w: '1.2fr', align: 'right' }, { h: 'Fees', w: '1fr', align: 'right' }, { h: 'Net', w: '1.2fr', align: 'right' }, { h: 'Status', w: '1fr' }]}
        rows={rows.map((r) => ({
          cells:
            r[0] === 'Fri, Oct 30'
              ? [
                  <Cell screen={S} id="fri.date">{r[0]}</Cell>,
                  <Cell screen={S} id="fri.count">{r[1]}</Cell>,
                  <Cell screen={S} id="fri.gross">{r[2]}</Cell>,
                  <Cell screen={S} id="fri.fees">{r[3]}</Cell>,
                  <Cell screen={S} id="fri.net">{r[4]}</Cell>,
                  <Cell screen={S} id="fri.status"><Status s={r[5]} /></Cell>,
                ]
              : [r[0], r[1], r[2], r[3], r[4], <Status s={r[5]} />],
        }))}
      />
    </Shell>
  );
};

const Payments: React.FC = () => {
  const S = 1;
  const rows: { n: string; a: string; s: string; m: string; d: string; dt: string; id?: string }[] = [
    { n: 'Ifeoma Obi', a: '₦9,800.00', s: 'Succeeded', m: 'Bank transfer', d: 'order_7731', dt: 'Oct 27' },
    { n: 'Chinedu Okafor', a: '₦18,500.00', s: 'Failed', m: 'Visa •••• 4417', d: 'Insufficient funds', dt: 'Oct 26', id: '1' },
    { n: 'Musa Danjuma', a: '₦15,400.00', s: 'Succeeded', m: 'Mastercard •••• 6630', d: 'order_7725', dt: 'Oct 26' },
    { n: 'Aisha Bello', a: '₦7,200.00', s: 'Failed', m: 'Mastercard •••• 0921', d: 'Insufficient funds', dt: 'Oct 26', id: '2' },
    { n: 'Bisi Alade', a: '₦22,000.00', s: 'Succeeded', m: 'Verve •••• 1184', d: 'order_7719', dt: 'Oct 25' },
    { n: 'Kelechi Nwosu', a: '₦12,000.00', s: 'Failed', m: 'Verve •••• 3308', d: 'Card expired', dt: 'Oct 25', id: '3' },
    { n: 'Zara Ibrahim', a: '$36.00', s: 'Succeeded', m: 'Visa •••• 5520', d: 'order_7712', dt: 'Oct 25' },
    { n: 'Grace Adeyemi', a: '$24.00', s: 'Failed', m: 'Visa •••• 7712', d: '3-D Secure not completed', dt: 'Oct 24', id: '4' },
    { n: 'Seun Ajayi', a: '₦6,500.00', s: 'Refunded', m: 'Bank transfer', d: 'order_7704', dt: 'Oct 24' },
    { n: 'Emeka Umeh', a: '₦31,250.00', s: 'Succeeded', m: 'Mastercard •••• 2048', d: 'order_7698', dt: 'Oct 23' },
  ];
  return (
    <Shell screen={S} nav="Payments" title="Payments">
      <Build screen={S} i={1} style={{ display: 'flex', gap: 18, marginBottom: 22 }}>
        <Stat label="Succeeded this week">214</Stat>
        <Stat label="Failed this week">
          <Cell screen={S} id="pay.failedCount" fs={30}>4</Cell>
        </Stat>
        <Stat label="Refunded this week">3</Stat>
        <Stat label="Volume this week">₦3,842,600.00</Stat>
      </Build>
      <Build screen={S} i={2} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <Chip on>Status: All</Chip>
        <Chip on>Date: This week</Chip>
        <Chip>Currency: Any</Chip>
        <Chip>Method: Any</Chip>
      </Build>
      <Table
        screen={S}
        from={3}
        cols={[{ h: 'Customer', w: '1.3fr' }, { h: 'Amount', w: '1fr', align: 'right' }, { h: 'Status', w: '0.9fr' }, { h: 'Method', w: '1.3fr' }, { h: 'Detail', w: '1.5fr' }, { h: 'Date', w: '0.6fr' }]}
        rows={rows.map((r) => ({
          cells: [
            r.n,
            r.a,
            r.id ? <Cell screen={S} id={`pay.s${r.id}`}><Status s={r.s} /></Cell> : <Status s={r.s} />,
            r.m,
            r.id ? <Cell screen={S} id={`pay.r${r.id}`}>{r.d}</Cell> : <span style={{ color: c.faint, fontFamily: fonts.mono, fontSize: 14 }}>{r.d}</span>,
            r.dt,
          ],
        }))}
      />
    </Shell>
  );
};

const Disputes: React.FC = () => {
  const S = 2;
  const rows = [
    { n: 'Femi Adebayo', a: '₦45,000.00', r: 'Product not received', s: 'Needs response', d: 'Nov 3', hit: true },
    { n: 'Hauwa Sani', a: '₦12,500.00', r: 'Duplicate charge', s: 'Under review', d: '—' },
    { n: 'Obinna Eze', a: '$60.00', r: 'Fraudulent', s: 'Under review', d: '—' },
    { n: 'Lara Oyelaran', a: '₦8,000.00', r: 'Product not received', s: 'Won', d: '—' },
    { n: 'Dayo Akin', a: '₦19,750.00', r: 'Not as described', s: 'Won', d: '—' },
    { n: 'Rukky Etim', a: '₦5,400.00', r: 'Subscription cancelled', s: 'Lost', d: '—' },
    { n: 'Kunle Bakare', a: '₦27,300.00', r: 'Credit not processed', s: 'Won', d: '—' },
  ];
  return (
    <Shell screen={S} nav="Disputes" title="Disputes">
      <Build screen={S} i={1} style={{ display: 'flex', gap: 18, marginBottom: 22 }}>
        <Stat label="Needs response">
          <Cell screen={S} id="dis.count" fs={30}>1</Cell>
        </Stat>
        <Stat label="Under review">2</Stat>
        <Stat label="Won, last 90 days">5</Stat>
        <Stat label="Lost, last 90 days">1</Stat>
      </Build>
      <Build screen={S} i={2} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <Chip on>Status: Open</Chip>
        <Chip>Last 90 days</Chip>
        <Chip>Currency: Any</Chip>
      </Build>
      <Table
        screen={S}
        from={3}
        cols={[{ h: 'Customer', w: '1.3fr' }, { h: 'Amount', w: '1fr', align: 'right' }, { h: 'Reason', w: '1.5fr' }, { h: 'Status', w: '1.2fr' }, { h: 'Evidence due', w: '0.9fr' }]}
        rows={rows.map((r) => ({
          cells: r.hit
            ? [
                <Cell screen={S} id="dis.name">{r.n}</Cell>,
                <Cell screen={S} id="dis.amount">{r.a}</Cell>,
                <Cell screen={S} id="dis.reason">{r.r}</Cell>,
                <Cell screen={S} id="dis.status"><Status s={r.s} /></Cell>,
                <Cell screen={S} id="dis.due">{r.d}</Cell>,
              ]
            : [r.n, r.a, r.r, <Status s={r.s} />, <span style={{ color: c.faint }}>{r.d}</span>],
        }))}
      />
    </Shell>
  );
};

const Account: React.FC = () => {
  const S = 3;
  const items = [
    { t: 'Business details', s: 'Approved', d: 'Registered name, address and CAC number' },
    { t: 'Director ID', s: 'Approved', d: 'Government-issued ID for each director', ok: true },
    { t: 'Bank account', s: 'Approved', d: 'Access Bank •••• 2210' },
    { t: 'Tax ID', s: 'Approved', d: 'TIN on file' },
    { t: 'Proof of address', s: 'Required', d: 'A utility bill or bank statement from the last 3 months', poa: true },
  ];
  return (
    <Shell screen={S} nav="Settings" title="Verification">
      <Build screen={S} i={1} style={{ marginBottom: 22 }}>
        <Panel style={{ padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 14, borderColor: '#f1d9b5', background: '#fdf8f0' }}>
          <span style={{ width: 9, height: 9, borderRadius: 5, background: c.amber }} />
          <span style={{ fontSize: 17 }}>Payouts are paused until verification is complete.</span>
        </Panel>
      </Build>
      <Panel>
        {items.map((it, i) => (
          <Build key={it.t} screen={S} i={2 + i}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr 1fr', alignItems: 'center', padding: '0 28px', height: 84, borderBottom: i < items.length - 1 ? `1px solid ${c.line}` : undefined }}>
              <div style={{ fontSize: 18, fontWeight: 500 }}>{it.poa ? <Cell screen={S} id="acc.poa" fs={18}>{it.t}</Cell> : it.t}</div>
              <div style={{ fontSize: 15, color: c.muted }}>{it.d}</div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 14, fontSize: 16 }}>
                {it.poa ? (
                  <>
                    <Cell screen={S} id="acc.req"><Status s="Required" /></Cell>
                    <span style={{ padding: '8px 14px', borderRadius: 8, background: c.ink, color: c.panel, fontSize: 14 }}>Upload</span>
                  </>
                ) : it.ok ? (
                  <Cell screen={S} id="acc.ok"><Status s="Approved" /></Cell>
                ) : (
                  <Status s="Approved" />
                )}
              </div>
            </div>
          </Build>
        ))}
      </Panel>
    </Shell>
  );
};

const SCREENS = [Balances, Payments, Disputes, Account];

// ---------- the answer ----------

// The dashboard is drawn at 1/Z size and scaled up, so it fills the frame like a real, dense screen.
// It holds still: the only movement is the answer leaving it.
const Z = 1.3;
const toScreen = (r: Rect) => ({ x: r.x * Z, y: r.y * Z });

const SentenceLayer: React.FC<{ i: number }> = ({ i }) => {
  const f = useCurrentFrame();
  const { reg, rects } = useContext(Reg);
  const b = BEATS[i];
  const s = SENTENCES[i];
  const last = i === SENTENCES.length - 1;
  const settled = f >= b.settle;
  // Letters that aren't carried from the table are written in between the travelling cells.
  const plainChars = s.toks.filter((t) => !t.src).reduce((a, t) => a + t.t.length, 0);
  let seen = 0;
  let ci = 0;
  return (
    <div style={{ position: 'absolute', left: 200, top: s.top, width: 1520, fontFamily: fonts.sans, fontWeight: 500, fontSize: s.size, lineHeight: 1.14, letterSpacing: '-0.03em', color: c.ink }}>
      {s.toks.map((tok, j) => {
        const tokStart = ci;
        const chars = [...tok.t].map((ch) => {
          const idx = ci++;
          let o = 1;
          let dx = 0;
          let dy = 0;
          let sc = 1;
          if (!tok.src) {
            const at = b.lift + 22 + (seen++ / Math.max(1, plainChars)) * (b.settle - b.lift - 26);
            o = k(f, at, at + 6);
          } else if (!settled) {
            o = 0; // its travelling copy is drawn by Flights until it lands
          }
          if (!last) {
            const t = k(f, b.end - 16, b.end + 6, IO);
            const ang = random(`a${i}-${idx}`) * Math.PI * 2;
            const d = 80 + random(`d${i}-${idx}`) * 220;
            dx = Math.cos(ang) * d * t;
            dy = Math.sin(ang) * d * t;
            o *= 1 - t;
          } else {
            // the last sentence gathers into the middle, where the end card appears
            const t = k(f, edit.endAt - 18, edit.endAt + 14, IO);
            const r = rects?.get(`s${i}.${j}`);
            const cx = r ? r.x + (idx - tokStart) * s.size * 0.5 : 960;
            const cy = r ? r.y + s.size * 0.5 : 540;
            dx = (960 - cx) * t;
            dy = (540 - cy) * t;
            sc = 1 - 0.7 * t;
            o *= 1 - t;
          }
          return (
            <span key={idx} style={{ display: 'inline-block', whiteSpace: 'pre', opacity: o, transform: dx || dy || sc !== 1 ? `translate(${dx}px, ${dy}px) scale(${sc})` : undefined }}>
              {ch}
            </span>
          );
        });
        return (
          <React.Fragment key={j}>
            <span ref={reg(`s${i}.${j}`, s.size)} style={{ display: 'inline-block', color: tok.accent ? c.cobalt : undefined, whiteSpace: 'nowrap' }}>
              {chars}
            </span>{' '}
          </React.Fragment>
        );
      })}
      {rects && <Flights i={i} />}
    </div>
  );
};

// Each answer cell, copied out of the table: it starts at the cell's size and place and
// grows into its word in the sentence, swapping the table's wording for the sentence's.
const Flights: React.FC<{ i: number }> = ({ i }) => {
  const f = useCurrentFrame();
  const { rects } = useContext(Reg);
  const b = BEATS[i];
  const s = SENTENCES[i];
  if (!rects || f < b.lift || f >= b.settle) return null;
  let n = 0;
  return (
    <>
      {s.toks.map((tok, j) => {
        if (!tok.src) return null;
        const from = rects.get(tok.src);
        const to = rects.get(`s${i}.${j}`);
        if (!from || !to) return null;
        const start = b.lift + n++ * 3;
        const t = k(f, start, start + 32, Easing.bezier(0.5, 0, 0.15, 1));
        const sc0 = (from.fs * Z) / s.size;
        const p0 = toScreen(from);
        // positions are relative to the sentence box
        // the cell's text starts 4 px inside its highlight
        const x0 = p0.x + 4 * Z - 200;
        const y0 = p0.y - s.top;
        const x = x0 + (to.x - 200 - x0) * t;
        const y = y0 + (to.y - s.top - y0) * t;
        const sc = sc0 + (1 - sc0) * t;
        const swap = k(f, start + 10, start + 22);
        return (
          <div key={j} style={{ position: 'absolute', left: 0, top: 0, transformOrigin: '0 0', transform: `translate(${x}px, ${y}px) scale(${sc})`, whiteSpace: 'nowrap', color: tok.accent ? c.cobalt : c.ink }}>
            <span style={{ position: 'absolute', left: 0, top: 0, opacity: 1 - swap, fontWeight: 400, color: c.cobalt }}>{from.text}</span>
            <span style={{ opacity: swap }}>{tok.t}</span>
          </div>
        );
      })}
    </>
  );
};

// ---------- the AI app's composer ----------

const Composer: React.FC = () => {
  const f = useCurrentFrame();
  const i = Math.max(0, BEATS.filter((b) => f >= b.at).length - 1);
  const b = BEATS[i];
  const shown = f >= edit.endAt - 16 ? 0 : 1;
  const appear = k(f, 12, 30, OUT);
  const typed = keyFrames(b.q, b.typeFrom, b.typeTo).filter((t) => f >= t).length;
  const typing = f >= b.typeFrom && typed < b.q.length;
  const clear = k(f, b.end - 16, b.end - 4);
  const sent = k(f, b.typeTo + 2, b.typeTo + 10);
  return (
    <div style={{ position: 'absolute', left: 470, width: 980, top: 890, opacity: appear * shown, transform: `translateY(${(1 - appear) * 24}px)` }}>
      <div style={{ height: 78, borderRadius: 20, background: c.panel, border: `1px solid ${c.line}`, boxShadow: '0 18px 50px rgba(28,29,43,0.14)', display: 'flex', alignItems: 'center', padding: '0 14px 0 30px', fontFamily: fonts.sans, fontSize: 25 }}>
        <div style={{ flex: 1, color: typed ? c.ink : c.faint, opacity: 1 - clear }}>
          {typed ? b.q.slice(0, typed) : 'Ask about Tolu’s Ovens…'}
          {typing && <span style={{ display: 'inline-block', width: 2, height: 28, marginLeft: 2, verticalAlign: '-5px', background: c.ink, opacity: f % 16 < 10 ? 1 : 0.2 }} />}
        </div>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: typed === b.q.length ? c.cobalt : c.line, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${1 - 0.12 * Math.sin(sent * Math.PI)})` }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        </div>
      </div>
      <div style={{ marginTop: 14, textAlign: 'center', fontFamily: fonts.sans, fontSize: 17, color: c.muted }}>Answered from your Bachs account over MCP · read-only · sandbox test data</div>
    </div>
  );
};

// ---------- the end card ----------

const EndCard: React.FC = () => {
  const f = useCurrentFrame();
  const a = edit.endAt;
  const t = k(f, a - 6, a + 22, OUT);
  const out = k(f, edit.total - 24, edit.total);
  if (f < a - 8) return null;
  const rise = (d: number) => ({ opacity: k(f, a + d, a + d + 14, OUT), transform: `translateY(${(1 - k(f, a + d, a + d + 14, OUT)) * 16}px)` });
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', fontFamily: fonts.sans, color: c.ink, opacity: 1 - out }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 34, opacity: t, transform: `scale(${0.9 + 0.1 * t})` }}>
        <Img src={staticFile('brand/logo-black.png')} style={{ height: 70 }} />
        <span style={{ fontSize: 96, fontWeight: 500, letterSpacing: '-0.03em', color: c.cobalt }}>MCP</span>
      </div>
      <div style={{ marginTop: 44, fontSize: 56, fontWeight: 500, letterSpacing: '-0.03em', ...rise(14) }}>Your dashboard, in plain words.</div>
      <div style={{ marginTop: 22, fontSize: 28, color: c.muted, ...rise(26) }}>Ask in Claude, ChatGPT and other apps that support MCP. Read-only.</div>
      <div style={{ marginTop: 26, fontFamily: fonts.mono, fontSize: 28, color: c.cobalt, ...rise(38) }}>mcp.bachs.io/mcp</div>
    </AbsoluteFill>
  );
};

// ---------- composition ----------

export const McpSentences: React.FC = () => {
  const f = useCurrentFrame();
  const root = useRef<HTMLDivElement>(null);
  const els = useRef(new Map<string, { el: HTMLElement; fs: number }>());
  const [rects, setRects] = useState<Map<string, Rect> | null>(null);
  const [handle] = useState(() => delayRender('measure answer cells'));
  const reg = useCallback(
    (id: string, fs: number) => (el: HTMLElement | null) => {
      if (el) els.current.set(id, { el, fs });
    },
    [],
  );
  useLayoutEffect(() => {
    Promise.all([document.fonts.load(`500 84px Geist`), document.fonts.load(`400 16px Geist`), document.fonts.load(`400 14px "Geist Mono"`)])
      .then(() => document.fonts.ready)
      .then(() => {
        const m = new Map<string, Rect>();
        els.current.forEach(({ el, fs }, id) => m.set(id, { ...relRect(el, root.current!), fs, text: el.innerText }));
        setRects(m);
        continueRender(handle);
      });
  }, [handle]);

  return (
    <Reg.Provider value={{ reg, rects }}>
      <AbsoluteFill ref={root} style={{ background: c.ground, overflow: 'hidden' }}>
        <style>{fontFaceCss}</style>
        {SCREENS.map((Screen, i) => {
          const b = BEATS[i];
          const shownFrom = i === 0 ? 0 : b.at - 8;
          // every screen stays laid out (invisible) so its cells can be measured
          const visible = f >= shownFrom && f < b.lift + 30;
          const dissolve = k(f, b.lift, b.lift + 24);
          return (
            <AbsoluteFill key={i} style={{ opacity: visible ? 1 - dissolve : 0, filter: dissolve > 0 ? `blur(${dissolve * 6}px)` : undefined }}>
              <div style={{ position: 'absolute', left: 0, top: 0, width: 1920 / Z, height: 1080 / Z, transform: `scale(${Z})`, transformOrigin: '0 0' }}>
                <Screen />
              </div>
            </AbsoluteFill>
          );
        })}
        {SENTENCES.map((_, i) => {
          const b = BEATS[i];
          const visible = f >= b.lift - 2 && f < (i === SENTENCES.length - 1 ? edit.endAt + 16 : b.end + 8);
          return (
            <AbsoluteFill key={i} style={{ visibility: visible || !rects ? 'visible' : 'hidden', opacity: visible ? 1 : 0 }}>
              <SentenceLayer i={i} />
            </AbsoluteFill>
          );
        })}
        {/* a clear band for the composer, so it never sits on top of table rows */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 300, background: `linear-gradient(rgba(244,245,248,0), ${c.ground} 45%)` }} />
        <Composer />
        <EndCard />
        <Audio src={staticFile('audio/mcpsentences-mix.wav')} />
      </AbsoluteFill>
    </Reg.Provider>
  );
};
