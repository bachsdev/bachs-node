import React from 'react';
import { AbsoluteFill } from 'remotion';
import { fontFaceCss, fonts } from '../theme';

// Bachs MCP, dressed as a transit network. Money moves along routes (NGN to
// GTBank, KES to M-Pesa), so each area of the account is a line, each kind of
// record a station, and each answer is read off a board or a route.
// Flat fields only: no gradients, glows, shadows, rules or tracked labels.

export const transit = {
  ink: '#15151d',
  board: '#20202a',
  paper: '#f5f4ef',
  cobalt: '#3070e8',
  white: '#ffffff',
  red: '#e4402b',
  green: '#1f9d55',
  amber: '#f2a900',
};

// One colour per line: the nine areas.
export const LINES = [
  { name: 'Payments', color: '#3070e8' },
  { name: 'Payouts', color: '#e4402b' },
  { name: 'Customers', color: '#1f9d55' },
  { name: 'Disputes', color: '#f2a900' },
  { name: 'Developers', color: '#15151d' },
  { name: 'Compliance', color: '#d6337f' },
  { name: 'Platforms', color: '#8a5a2b' },
  { name: 'Search', color: '#00a3b4' },
  { name: 'Docs', color: '#8c8d98' },
];

const sans = fonts.sans;
const tab: React.CSSProperties = { fontVariantNumeric: 'tabular-nums' };

// ---------- 1. the departure board ----------

type BoardRow = { what: string; cur: string; amount: string; when: string; status: string; tone: string };
const ROWS: BoardRow[] = [
  { what: 'Settled', cur: 'USD', amount: '$1,980.00', when: 'Mon 26 Oct', status: 'Arrived', tone: transit.green },
  { what: 'Available', cur: 'USD', amount: '$4,212.40', when: 'Now', status: 'Ready', tone: transit.green },
  { what: 'Available', cur: 'NGN', amount: '₦1,284,500.00', when: 'Now', status: 'Ready', tone: transit.green },
  { what: 'Settling', cur: 'USD', amount: '$860.00', when: 'Tomorrow, 28 Oct', status: 'On time', tone: transit.cobalt },
  { what: 'Settling', cur: 'NGN', amount: '₦312,000.00', when: 'Tomorrow, 28 Oct', status: 'On time', tone: transit.amber },
  { what: 'Settling', cur: 'KES', amount: 'KSh 48,200.00', when: 'Thu 29 Oct', status: 'Scheduled', tone: transit.amber },
  { what: 'Settling', cur: 'GHS', amount: 'GH₵ 9,410.00', when: 'Fri 30 Oct', status: 'Scheduled', tone: transit.amber },
  { what: 'Settling', cur: 'USD', amount: '$1,120.00', when: 'Mon 2 Nov', status: 'Scheduled', tone: transit.amber },
];

export const FrameBoard: React.FC = () => {
  const ROW = 76;
  const GAP = 6;
  const open = 3;
  let y = 420 - ROW / 2; // the first row is cut by the top of the board
  return (
    <AbsoluteFill style={{ background: transit.ink, overflow: 'hidden', fontFamily: sans }}>
      <style>{fontFaceCss}</style>
      <div style={{ position: 'absolute', left: 96, top: 74, width: 1700, fontWeight: 500, fontSize: 96, lineHeight: 1.0, letterSpacing: '-0.035em', color: transit.white }}>
        How much money do I have, and what settles tomorrow?
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 420, bottom: 0, overflow: 'hidden' }}>
        {ROWS.map((r, i) => {
          const h = i === open ? 220 : ROW;
          const top = y - 420;
          y += h + GAP;
          const isOpen = i === open;
          return (
            <div key={i} style={{ position: 'absolute', left: 16, right: 16, top, height: h, background: isOpen ? transit.cobalt : transit.board, color: transit.white, ...tab }}>
              <div style={{ position: 'absolute', left: 80, top: 0, height: ROW, display: 'flex', alignItems: 'center', fontSize: 32, fontWeight: 500 }}>{r.what}</div>
              <div style={{ position: 'absolute', left: 520, top: 0, height: ROW, display: 'flex', alignItems: 'center', fontSize: 32, opacity: 0.75 }}>{r.cur}</div>
              <div style={{ position: 'absolute', left: 700, top: 0, height: ROW, display: 'flex', alignItems: 'center', fontSize: 32, fontWeight: 500 }}>{r.amount}</div>
              <div style={{ position: 'absolute', left: 1120, top: 0, height: ROW, display: 'flex', alignItems: 'center', fontSize: 32, opacity: isOpen ? 1 : 0.8 }}>{r.when}</div>
              <div style={{ position: 'absolute', right: 0, top: 0, width: 260, height: ROW, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isOpen ? transit.white : r.tone, color: isOpen ? transit.cobalt : r.tone === transit.amber ? transit.ink : transit.white, fontSize: 28, fontWeight: 600 }}>
                {r.status}
              </div>
              {isOpen && (
                <div style={{ position: 'absolute', left: 80, top: ROW + 20, fontSize: 30, lineHeight: 1.4, width: 1300 }}>
                  $860.00 and ₦312,000.00 land in your bank tomorrow, from 23 card and bank-transfer payments.
                  <div style={{ opacity: 0.75 }}>Sandbox account, test data.</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ---------- 2. the route that stopped ----------

const Station: React.FC<{ x: number; y: number; ring: string; fill?: string }> = ({ x, y, ring, fill = transit.white }) => (
  <div style={{ position: 'absolute', left: x - 34, top: y - 34, width: 68, height: 68, borderRadius: 34, background: fill, border: `14px solid ${ring}`, boxSizing: 'border-box' }} />
);

export const FrameRoute: React.FC = () => {
  const y = 690;
  const L = 18; // line weight
  return (
    <AbsoluteFill style={{ background: transit.cobalt, overflow: 'hidden', fontFamily: sans, color: transit.white }}>
      <style>{fontFaceCss}</style>
      <div style={{ position: 'absolute', left: 96, top: 74, width: 1500, fontWeight: 500, fontSize: 132, lineHeight: 0.98, letterSpacing: '-0.04em' }}>Why did my last payout fail?</div>
      {/* the line: balance to Bachs, then on towards the bank until it stops */}
      <div style={{ position: 'absolute', left: 0, width: 1160, top: y - L / 2, height: L, background: transit.ink }} />
      <div style={{ position: 'absolute', left: 1350, right: 0, top: y - L / 2, height: L, background: 'rgba(21,21,29,0.25)' }} />
      <Station x={260} y={y} ring={transit.ink} />
      <Station x={820} y={y} ring={transit.ink} />
      <Station x={1560} y={y} ring="rgba(21,21,29,0.25)" fill={transit.cobalt} />
      {/* the stop */}
      <div style={{ position: 'absolute', left: 1160, top: y - 95, width: 190, height: 190, background: transit.red, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 96, height: 22, background: transit.white }} />
      </div>
      {[
        { x: 260, t: 'NGN balance', s: '₦450,000.00' },
        { x: 820, t: 'Bachs', s: 'Payout sent Oct 25' },
        { x: 1560, t: 'GTBank •••• 4410', s: 'Never arrived', dim: true },
      ].map((st) => (
        <div key={st.t} style={{ position: 'absolute', left: st.x - 34, top: y + 66, opacity: st.dim ? 0.55 : 1 }}>
          <div style={{ fontSize: 38, fontWeight: 500, letterSpacing: '-0.02em' }}>{st.t}</div>
          <div style={{ fontSize: 26, opacity: 0.8, ...tab }}>{st.s}</div>
        </div>
      ))}
      <div style={{ position: 'absolute', left: 1160, top: y - 170, width: 520, fontSize: 32, fontWeight: 600, color: transit.ink }}>Stopped: name mismatch</div>
      <div style={{ position: 'absolute', left: 96, top: 930, width: 1300, fontSize: 34, lineHeight: 1.35 }}>
        The name on the bank account doesn't match your business name, so the bank sent it back.
      </div>
      <div style={{ position: 'absolute', right: 96, top: 940, fontSize: 24, opacity: 0.75 }}>Sandbox, test data</div>
    </AbsoluteFill>
  );
};

// ---------- 3. the whole account as a network ----------

type Pt = [number, number];
// Octilinear routes on a 1180 x 820 canvas, all through the Bachs interchange at (590, 410),
// each with where its name sits: [x, y, anchor].
const ROUTES: { pts: Pt[]; label: [number, number, 'start' | 'end' | 'middle'] }[] = [
  { pts: [[40, 232], [184, 376], [1000, 376], [1130, 246]], label: [1130, 222, 'end'] },
  { pts: [[40, 410], [1040, 410], [1150, 520]], label: [40, 392, 'start'] },
  { pts: [[90, 650], [296, 444], [930, 444], [1110, 624]], label: [90, 692, 'start'] },
  { pts: [[556, 40], [556, 790]], label: [544, 30, 'end'] },
  { pts: [[590, 70], [590, 800]], label: [604, 62, 'start'] },
  { pts: [[624, 150], [624, 300], [804, 480], [1130, 480]], label: [638, 140, 'start'] },
  { pts: [[250, 70], [590, 410], [920, 740]], label: [932, 782, 'start'] },
  { pts: [[970, 60], [600, 430], [262, 768]], label: [984, 48, 'start'] },
  { pts: [[60, 110], [200, 110], [470, 380], [560, 380]], label: [60, 90, 'start'] },
];
const STOPS = [7, 7, 6, 6, 6, 6, 5, 5, 5]; // 53 in all

const along = (r: Pt[], n: number) => {
  const seg = r.slice(1).map((p, i) => Math.hypot(p[0] - r[i][0], p[1] - r[i][1]));
  const total = seg.reduce((a, b) => a + b, 0);
  const out: Pt[] = [];
  let k = 0;
  for (let i = 0; out.length < n && k < 400; k++) {
    const d = total * (0.06 + (0.88 * k) / 399);
    let acc = 0;
    for (let s = 0; s < seg.length; s++) {
      if (d <= acc + seg[s]) {
        const t = (d - acc) / seg[s];
        const p: Pt = [r[s][0] + (r[s + 1][0] - r[s][0]) * t, r[s][1] + (r[s + 1][1] - r[s][1]) * t];
        const far = Math.hypot(p[0] - 590, p[1] - 410) > 130;
        const spaced = out.every((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) > total / (n + 2));
        if (far && spaced) out.push(p);
        break;
      }
      acc += seg[s];
    }
    i++;
  }
  return out;
};

export const FrameNetwork: React.FC = () => (
  <AbsoluteFill style={{ background: transit.paper, overflow: 'hidden', fontFamily: sans, color: transit.ink }}>
    <style>{fontFaceCss}</style>
    <div style={{ position: 'absolute', left: 96, top: 74, width: 640, fontWeight: 500, fontSize: 112, lineHeight: 0.98, letterSpacing: '-0.04em' }}>53 kinds of record.</div>
    <div style={{ position: 'absolute', left: 96, top: 390, width: 560, fontSize: 34, lineHeight: 1.35 }}>
      Nine lines through your Bachs account. Ask about any stop on them in plain words.
    </div>
    <div style={{ position: 'absolute', left: 96, top: 900, width: 560, fontSize: 26, lineHeight: 1.4, opacity: 0.7 }}>In our tests, Claude answered all 20 merchant questions correctly.</div>
    <svg width={1180} height={820} viewBox="0 0 1180 820" style={{ position: 'absolute', left: 700, top: 150 }}>
      {ROUTES.map((r, i) => (
        <polyline key={i} points={r.pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={LINES[i].color} strokeWidth={16} strokeLinejoin="round" strokeLinecap="round" />
      ))}
      {ROUTES.map((r, i) =>
        along(r.pts, STOPS[i]).map(([x, y], j) => <circle key={`${i}-${j}`} cx={x} cy={y} r={11} fill={transit.paper} stroke={transit.ink} strokeWidth={5} />),
      )}
      <rect x={505} y={378} width={170} height={64} rx={32} fill={transit.paper} stroke={transit.ink} strokeWidth={8} />
      <text x={590} y={420} textAnchor="middle" fontFamily="Geist, sans-serif" fontWeight={600} fontSize={28} fill={transit.ink}>
        Bachs
      </text>
      {ROUTES.map((r, i) => (
        <text key={`l${i}`} x={r.label[0]} y={r.label[1]} textAnchor={r.label[2]} fontFamily="Geist, sans-serif" fontWeight={600} fontSize={24} fill={LINES[i].color}>
          {LINES[i].name}
        </text>
      ))}
    </svg>
  </AbsoluteFill>
);
