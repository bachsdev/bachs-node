import React from 'react';
import { AbsoluteFill, Audio, Easing, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { fontFaceCss, fonts } from '../theme';
import edit from './edit.json';

// Bachs Global Payouts. The dashboard's withdrawal flow, four times, to four kinds
// of destination: a saved destination slides from the list on the left into the
// confirm panel, the figures roll in, it is confirmed and tracked to Completed, and
// the finished payout lands in the list on the right. Then an auto-payout. The
// screen holds still; only its contents move. Fees are the default rates from the
// docs; exchange rates are examples and say so.

export const PAYOUTS_TOTAL = edit.total;

const c = {
  ground: '#3672ea',
  panel: '#ffffff',
  ink: '#1c1d2b',
  muted: '#6b7084',
  faint: '#a2a7b8',
  line: '#e7e9f0',
  soft: '#f4f6fb',
  green: '#1f9d62',
  cobalt: '#3672ea',
};

const IO = Easing.bezier(0.4, 0, 0.2, 1);
const OUT = Easing.bezier(0.05, 0.7, 0.1, 1);
const k = (f: number, a: number, z: number, easing = IO) => interpolate(f, [a, z], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing });

type Payout = (typeof edit.payouts)[number];
const P = edit.payouts as Payout[];
const A = edit.auto;

const DEST = [
  { code: 'GBP', name: 'UK account', detail: '•••• 4127', method: 'Faster Payments' },
  { code: 'KES', name: 'M-Pesa', detail: '+254 7•• ••• 318', method: 'Mobile money' },
  { code: 'USDC', name: 'USDC wallet', detail: '0x7a3f…c91e', method: 'Base' },
  { code: 'NGN', name: 'Lagos operations', detail: '•••• 2054', method: 'Nigerian bank transfer' },
];

const money = (n: number, sym: string, dp = 2) => `${sym}${n.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp })}`;
const srcSym = (p: Payout) => (p.src === 'NGN' ? '₦' : '$');

// ---------- rolling figures ----------

// Digits roll like an odometer from one value to another. Leading places stay
// hidden until the value reaches them, so a figure grows from the right.
const Roll: React.FC<{ from: number; to: number; t: number; sym: string; suffix?: string; size: number; weight?: number; color?: string }> = ({ from, to, t, sym, suffix = '', size, weight = 500, color = c.ink }) => {
  const v = from + (to - from) * t;
  const tpl = money(Math.max(from, to), '');
  const intLen = tpl.split('.')[0].replace(/,/g, '').length;
  let place = intLen - 1; // power of ten of the next digit in the template
  const cells: React.ReactNode[] = [];
  const lh = size * 1.1;
  // Every character sits in a cell of the same height, so symbols, commas and rolling
  // digits share one baseline; places the value hasn't reached take no width.
  const cell = (key: number | string, w: string, shown: number, child: React.ReactNode) => (
    <span key={key} style={{ display: 'inline-block', width: shown ? w : 0, height: lh, lineHeight: `${lh}px`, overflow: 'hidden', verticalAlign: 'top', textAlign: 'center', opacity: shown }}>{child}</span>
  );
  [...tpl].forEach((ch, i) => {
    if (ch === ',' || ch === '.') {
      const p = ch === ',' ? place + 1 : 0;
      cells.push(cell(i, '0.28em', ch === '.' || v >= Math.pow(10, p) - 1e-6 ? 1 : 0, ch));
      return;
    }
    const p = place--;
    const unit = Math.pow(10, p);
    // Like a real odometer: a digit turns over only while the place below it passes 9,
    // and only while the figure is changing, so a figure at rest always reads exactly.
    const whole = Math.floor(v / unit + 1e-6);
    const turning = t > 0 && t < 1 ? Math.max(0, ((v % unit) / unit - 0.9) / 0.1) : 0;
    const d = (whole % 10) + turning;
    const shown = p <= 0 || v >= unit - 1e-6 ? 1 : 0;
    cells.push(
      cell(
        i,
        '0.6em',
        shown,
        <span style={{ display: 'block', transform: `translateY(${-d * lh}px)` }}>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((n, j) => (
            <span key={j} style={{ display: 'block', height: lh, lineHeight: `${lh}px` }}>{n}</span>
          ))}
        </span>,
      ),
    );
  });
  return (
    <span style={{ display: 'inline-flex', alignItems: 'flex-start', height: lh, fontSize: size, fontWeight: weight, color, lineHeight: `${lh}px`, letterSpacing: '-0.02em', whiteSpace: 'pre', fontVariantNumeric: 'tabular-nums' }}>
      {sym && <span style={{ height: lh, lineHeight: `${lh}px` }}>{sym}</span>}
      {cells}
      {suffix && <span style={{ height: lh, lineHeight: `${lh}px` }}>{suffix}</span>}
    </span>
  );
};

const Tap: React.FC<{ at: number; x: number; y: number }> = ({ at, x, y }) => {
  const f = useCurrentFrame();
  const t = k(f, at - 2, at + 16, OUT);
  if (f < at - 2 || f > at + 16) return null;
  return <div style={{ position: 'absolute', left: x - 40, top: y - 40, width: 80, height: 80, borderRadius: 40, border: '3px solid rgba(255,255,255,0.9)', transform: `scale(${0.4 + 0.8 * t})`, opacity: 1 - t, boxShadow: '0 0 0 1px rgba(28,29,43,0.15)' }} />;
};

// ---------- layout ----------

const L = { x: 120, w: 500 };
const BAL = { y: 130, h: 250 };
const DST = { y: 410, h: 470, row0: 490, rowH: 92 };
const MID = { x: 680, w: 560, y: 130, h: 750 };
const RIGHT = { x: 1300, w: 500 };
const ROW_H = 72;
const ROWS_TOP = 280;

const Card: React.FC<{ x: number; y: number; w: number; h: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ x, y, w, h, children, style }) => {
  const f = useCurrentFrame();
  const t = k(f, 0, 22, OUT);
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, background: c.panel, borderRadius: 22, boxShadow: '0 24px 60px rgba(16,30,90,0.22)', overflow: 'hidden', opacity: t, transform: `translateY(${(1 - t) * 18}px)`, fontFamily: fonts.sans, color: c.ink, ...style }}>
      {children}
    </div>
  );
};

const Badge: React.FC<{ code: string }> = ({ code }) => (
  <span style={{ width: 52, height: 52, borderRadius: 14, background: c.soft, color: c.cobalt, fontFamily: fonts.mono, fontSize: code.length > 3 ? 14 : 16, fontWeight: 500, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{code}</span>
);

// The balances after each payout that has left them.
const balances = (f: number) => {
  let usd = 9640;
  let ngn = 2860000;
  let usdFrom = usd;
  let ngnFrom = ngn;
  let tU = 1;
  let tN = 1;
  P.forEach((p) => {
    const debit = p.amount + p.fee;
    const t = k(f, p.balRoll[0], p.balRoll[1]);
    if (p.src === 'USD') {
      if (t > 0) {
        usdFrom = usd;
        usd -= debit;
        tU = t;
      }
    } else if (t > 0) {
      ngnFrom = ngn;
      ngn -= debit;
      tN = t;
    }
  });
  return { usd: { from: usdFrom, to: usd, t: tU }, ngn: { from: ngnFrom, to: ngn, t: tN } };
};

const Balances: React.FC = () => {
  const f = useCurrentFrame();
  const b = balances(f);
  const press = 1 - 0.06 * Math.sin(k(f, 62, 72) * Math.PI);
  return (
    <Card x={L.x} y={BAL.y} w={L.w} h={BAL.h}>
      <div style={{ padding: '26px 30px' }}>
        <div style={{ fontSize: 22, fontWeight: 500 }}>Balances</div>
        <div style={{ marginTop: 22, display: 'grid', gap: 14 }}>
          <div>
            <div style={{ fontSize: 15, color: c.muted }}>USD available</div>
            <Roll from={b.usd.from} to={b.usd.to} t={b.usd.t} sym="$" size={34} />
          </div>
          <div>
            <div style={{ fontSize: 15, color: c.muted }}>NGN available</div>
            <Roll from={b.ngn.from} to={b.ngn.to} t={b.ngn.t} sym="₦" size={34} />
          </div>
        </div>
      </div>
      <div style={{ position: 'absolute', right: 28, bottom: 28, padding: '12px 22px', borderRadius: 12, background: c.ink, color: c.panel, fontSize: 17, fontWeight: 500, transform: `scale(${press})` }}>Withdraw</div>
    </Card>
  );
};

const activeDest = (f: number) => {
  const p = [...P].reverse().find((x) => f >= x.slide[0]);
  return p && f < p.toList[0] && f < A.at ? p.dest : -1;
};

const Destinations: React.FC = () => {
  const f = useCurrentFrame();
  const on = activeDest(f);
  return (
    <Card x={L.x} y={DST.y} w={L.w} h={DST.h}>
      <div style={{ padding: '26px 30px 0', fontSize: 22, fontWeight: 500 }}>Saved destinations</div>
      {DEST.map((d, i) => (
        <div key={d.name} style={{ position: 'absolute', left: 16, right: 16, top: DST.row0 - DST.y + i * DST.rowH, height: DST.rowH - 10, borderRadius: 14, display: 'flex', alignItems: 'center', gap: 16, padding: '0 14px', background: on === i ? c.soft : 'transparent', outline: on === i ? `2px solid ${c.cobalt}` : undefined }}>
          <Badge code={d.code} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 500 }}>{d.name}</div>
            <div style={{ fontSize: 14, color: c.muted }}>
              <span style={{ fontFamily: fonts.mono }}>{d.detail}</span> · {d.method}
            </div>
          </div>
        </div>
      ))}
    </Card>
  );
};

// ---------- the centre panel ----------

const Row: React.FC<{ i: number; label: string; children: React.ReactNode; at: number; big?: boolean }> = ({ i, label, children, at, big }) => {
  const f = useCurrentFrame();
  const t = k(f, at, at + 10, OUT);
  return (
    <div style={{ position: 'absolute', left: 36, right: 36, top: ROWS_TOP - MID.y + i * ROW_H, height: big ? ROW_H + 18 : ROW_H, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${c.line}`, opacity: t }}>
      <span style={{ fontSize: 17, color: c.muted }}>{label}</span>
      <span style={{ fontSize: big ? 30 : 19, fontWeight: big ? 500 : 400 }}>{children}</span>
    </div>
  );
};

const Confirm: React.FC<{ p: Payout }> = ({ p }) => {
  const f = useCurrentFrame();
  const d = DEST[p.dest];
  const sym = srcSym(p);
  const hasRate = !!p.rate;
  const idx = (n: number) => (hasRate || n < 2 ? n : n - 1);
  const landed = f >= p.slide[1];
  const press = 1 - 0.05 * Math.sin(k(f, p.confirm - 2, p.confirm + 8) * Math.PI);
  return (
    <>
      <div style={{ position: 'absolute', left: 36, top: 34 }}>
        <div style={{ fontSize: 28, fontWeight: 500, letterSpacing: '-0.02em' }}>Confirm withdrawal</div>
        <div style={{ fontSize: 16, color: c.muted, marginTop: 6 }}>Review the details below before confirming.</div>
      </div>
      <Row i={idx(0)} label="Amount" at={p.roll[0] - 4}>
        <Roll from={0} to={p.amount} t={k(f, p.roll[0], p.roll[1])} sym={sym} size={19} weight={400} />
      </Row>
      <Row i={idx(1)} label="Destination" at={p.slide[0]}>
        <span style={{ opacity: landed ? 1 : 0 }}>
          {d.name} · <span style={{ fontFamily: fonts.mono, fontSize: 16 }}>{d.detail}</span>
        </span>
      </Row>
      {hasRate && (
        <Row i={2} label="Exchange rate" at={p.rows[0]}>
          {p.rate} <span style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 6, background: c.soft, color: c.muted, fontSize: 13 }}>example</span>
        </Row>
      )}
      <Row i={idx(3)} label={hasRate ? 'Conversion fee' : 'Fee'} at={p.rows[1]}>
        {money(p.fee, sym)}
      </Row>
      <Row i={idx(4)} label="To receive" at={p.rows[2]} big>
        <Roll from={0} to={p.recv_num} t={k(f, p.recvRoll[0], p.recvRoll[1])} sym={p.recv_sym} suffix={p.recv_sym ? '' : ' USDC'} size={30} />
      </Row>
      <div style={{ position: 'absolute', left: 36, right: 36, top: ROWS_TOP - MID.y + idx(4) * ROW_H + ROW_H + 18, height: ROW_H, display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: k(f, p.rows[3], p.rows[3] + 10, OUT) }}>
        <span style={{ fontSize: 17, color: c.muted }}>Total debited</span>
        <span style={{ fontSize: 19, fontWeight: 500 }}>{money(p.amount + p.fee, sym)}</span>
      </div>
      <div style={{ position: 'absolute', left: 36, right: 36, bottom: 36, height: 64, borderRadius: 14, background: c.ink, color: c.panel, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, fontWeight: 500, transform: `scale(${press})`, opacity: k(f, p.rows[3], p.rows[3] + 10) * 0.75 + 0.25 }}>
        Confirm withdrawal
      </div>
    </>
  );
};

const STAGES = ['Requested', 'In review', 'In transit', 'Completed'];
const Tracker: React.FC<{ p: Payout; n: number }> = ({ p, n }) => {
  const f = useCurrentFrame();
  const d = DEST[p.dest];
  const done = f >= p.steps[3];
  return (
    <>
      <div style={{ position: 'absolute', left: 36, top: 34, right: 36 }}>
        <div style={{ fontSize: 20, fontWeight: 500 }}>Withdrawal</div>
        <div style={{ marginTop: 22, fontSize: 52, fontWeight: 500, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>−{p.receive}</div>
        <div style={{ fontSize: 16, color: c.muted, marginTop: 4 }}>Today, 10:0{2 + n} AM</div>
        <div style={{ marginTop: 26, display: 'flex', gap: 40, fontSize: 17 }}>
          <div>
            <div style={{ color: c.muted, fontSize: 14 }}>From</div>
            {p.src} balance
          </div>
          <div>
            <div style={{ color: c.muted, fontSize: 14 }}>To</div>
            {d.name}
          </div>
        </div>
      </div>
      <div style={{ position: 'absolute', left: 36, right: 36, top: 330 }}>
        {STAGES.map((s, i) => {
          const on = k(f, p.steps[i], p.steps[i] + 6);
          return (
            <div key={s} style={{ position: 'relative', height: 58, display: 'flex', alignItems: 'center', gap: 18, fontSize: 19 }}>
              {i < 3 && <div style={{ position: 'absolute', left: 10, top: 40, width: 3, height: 36, background: c.line }}><div style={{ height: `${k(f, p.steps[i], p.steps[i + 1]) * 100}%`, background: c.green }} /></div>}
              <span style={{ width: 23, height: 23, borderRadius: 12, boxSizing: 'border-box', border: `3px solid ${on > 0.5 ? c.green : c.line}`, background: on > 0.5 && (i === 3 || f >= p.steps[i + 1]) ? c.green : c.panel, flex: 'none' }} />
              <span style={{ color: on > 0.5 ? c.ink : c.faint, fontWeight: on > 0.5 && f < (p.steps[i + 1] ?? 1e9) ? 500 : 400 }}>{s}</span>
            </div>
          );
        })}
        <div style={{ marginTop: 14, fontSize: 17, color: done ? c.green : c.muted, opacity: k(f, p.steps[2], p.steps[2] + 8) }}>{done ? 'Completed.' : p.status}</div>
      </div>
      <div style={{ position: 'absolute', left: 36, right: 36, bottom: 36, display: 'grid', gap: 10, fontSize: 16 }}>
        {[
          ['Requested by', 'Dashboard'],
          ['Fee', money(p.fee, srcSym(p))],
          ['Withdrawal ID', `pay_${['4f2c91', '8b17e0', 'c3a5d2', '1e9b74'][n]}`],
        ].map(([a, b]) => (
          <div key={a} style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${c.line}`, paddingTop: 10 }}>
            <span style={{ color: c.muted }}>{a}</span>
            <span style={{ fontFamily: a === 'Withdrawal ID' ? fonts.mono : undefined }}>{b}</span>
          </div>
        ))}
      </div>
    </>
  );
};

const Auto: React.FC = () => {
  const f = useCurrentFrame();
  const weekly = f >= A.weekly;
  const on = f >= A.turnOn;
  const press = 1 - 0.05 * Math.sin(k(f, A.turnOn - 2, A.turnOn + 8) * Math.PI);
  const field = (label: string, value: React.ReactNode, i: number) => (
    <div key={label} style={{ position: 'absolute', left: 36, right: 36, top: 170 + i * 76, height: 76, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${c.line}`, opacity: k(f, A.at + 6 + i * 4, A.at + 16 + i * 4, OUT) }}>
      <span style={{ fontSize: 17, color: c.muted }}>{label}</span>
      <span style={{ fontSize: 19 }}>{value}</span>
    </div>
  );
  return (
    <>
      <div style={{ position: 'absolute', left: 36, top: 34 }}>
        <div style={{ fontSize: 28, fontWeight: 500, letterSpacing: '-0.02em' }}>Auto-payout</div>
        <div style={{ fontSize: 16, color: c.muted, marginTop: 6 }}>Only money that has cleared is sent.</div>
      </div>
      {field('Balance', 'NGN', 0)}
      {field(
        'How often',
        <span style={{ display: 'flex', gap: 6 }}>
          {['Instant', 'Daily', 'Weekly', 'Monthly'].map((o) => (
            <span key={o} style={{ padding: '6px 12px', borderRadius: 999, fontSize: 15, background: o === 'Weekly' && weekly ? c.ink : c.soft, color: o === 'Weekly' && weekly ? c.panel : c.muted }}>{o}</span>
          ))}
        </span>,
        1,
      )}
      {field('Day', 'Thursday', 2)}
      {field('Time', '10:00 AM', 3)}
      {field('Sends to', `${DEST[3].name} · ${DEST[3].detail}`, 4)}
      <div style={{ position: 'absolute', left: 36, right: 36, bottom: 36, height: 64, borderRadius: 14, background: on ? c.soft : c.ink, color: on ? c.green : c.panel, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontSize: 19, fontWeight: 500, transform: `scale(${press})` }}>
        {on ? (
          <>
            <span style={{ width: 10, height: 10, borderRadius: 5, background: c.green }} /> On · Every Thursday at 10:00 AM
          </>
        ) : (
          'Turn on auto-payout'
        )}
      </div>
    </>
  );
};

const Panel: React.FC = () => {
  const f = useCurrentFrame();
  // which view the panel shows, with a short crossfade between views
  const views: { from: number; to: number; el: React.ReactNode }[] = [];
  views.push({
    from: 0,
    to: P[0].slide[0],
    el: (
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.faint, fontSize: 19, opacity: k(f, 64, 80) }}>Choose a destination</div>
    ),
  });
  P.forEach((p, n) => {
    views.push({ from: p.at, to: p.confirm + 8, el: <Confirm p={p} /> });
    views.push({ from: p.confirm + 8, to: P[n + 1]?.at ?? A.at, el: <Tracker p={p} n={n} /> });
  });
  views.push({ from: A.at, to: edit.total, el: <Auto /> });
  return (
    <Card x={MID.x} y={MID.y} w={MID.w} h={MID.h}>
      {views.map((v, i) => {
        if (f < v.from - 1 || f >= v.to + 8) return null;
        const o = k(f, v.from, v.from + 8) * (1 - k(f, v.to, v.to + 8));
        return (
          <div key={i} style={{ position: 'absolute', inset: 0, opacity: i === 0 ? 1 - k(f, v.to, v.to + 8) : o }}>
            {v.el}
          </div>
        );
      })}
    </Card>
  );
};

// The saved destination travels from its row into the panel's Destination row.
const Slide: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <>
      {P.map((p, n) => {
        if (f < p.slide[0] || f >= p.slide[1]) return null;
        const t = k(f, p.slide[0], p.slide[1], Easing.bezier(0.5, 0, 0.15, 1));
        const d = DEST[p.dest];
        const x0 = L.x + 30;
        const y0 = DST.row0 + p.dest * DST.rowH + 6;
        const x1 = MID.x + MID.w - 36 - 330;
        const y1 = ROWS_TOP + 1 * ROW_H + (ROW_H - 70) / 2;
        return (
          <div key={n} style={{ position: 'absolute', left: x0 + (x1 - x0) * t, top: y0 + (y1 - y0) * t, width: 330, height: 70, borderRadius: 14, background: c.panel, boxShadow: `0 ${18 * Math.sin(t * Math.PI)}px 40px rgba(16,30,90,${0.25 * Math.sin(t * Math.PI)})`, display: 'flex', alignItems: 'center', gap: 14, padding: '0 14px', boxSizing: 'border-box', fontFamily: fonts.sans, color: c.ink }}>
            <Badge code={d.code} />
            <div>
              <div style={{ fontSize: 17, fontWeight: 500 }}>{d.name}</div>
              <div style={{ fontSize: 13, color: c.muted, fontFamily: fonts.mono }}>{d.detail}</div>
            </div>
          </div>
        );
      })}
    </>
  );
};

// ---------- the activity list ----------

const Activity: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Card x={RIGHT.x} y={MID.y} w={RIGHT.w} h={MID.h}>
      <div style={{ padding: '26px 30px 0', fontSize: 22, fontWeight: 500 }}>Withdrawals</div>
      <div style={{ padding: '6px 30px 0', fontSize: 15, color: c.muted }}>Today</div>
      {P.map((p, n) => {
        const t = k(f, p.toList[0], p.toList[1], OUT);
        if (t <= 0) return null;
        const d = DEST[p.dest];
        return (
          <div key={n} style={{ position: 'absolute', left: 16, right: 16, top: 110 + n * 104, height: 92, borderRadius: 14, display: 'flex', alignItems: 'center', gap: 16, padding: '0 14px', opacity: t, transform: `translateX(${(1 - t) * -60}px)`, background: n === P.findIndex((x) => f >= x.toList[0] && f < x.toList[1] + 30) ? c.soft : 'transparent' }}>
            <Badge code={d.code} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 500 }}>{d.name}</div>
              <div style={{ fontSize: 14, color: c.green, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 7, height: 7, borderRadius: 4, background: c.green }} /> Completed
              </div>
            </div>
            <div style={{ fontSize: 19, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>−{p.receive}</div>
          </div>
        );
      })}
    </Card>
  );
};

// ---------- captions and end card ----------

const Captions: React.FC = () => {
  const f = useCurrentFrame();
  const caps = [...P.map((p) => ({ at: p.at + 8, text: p.caption })), { at: A.at + 8, text: A.caption }];
  return (
    <>
      {caps.map((cap, i) => {
        const next = caps[i + 1]?.at ?? edit.endAt - 14;
        const o = k(f, cap.at, cap.at + 12, OUT) * (1 - k(f, next - 10, next));
        if (o <= 0) return null;
        return (
          <div key={i} style={{ position: 'absolute', left: 120, top: 940, fontFamily: fonts.sans, fontSize: 38, fontWeight: 500, letterSpacing: '-0.02em', color: c.panel, opacity: o, transform: `translateY(${(1 - k(f, cap.at, cap.at + 12, OUT)) * 10}px)` }}>
            {cap.text}
          </div>
        );
      })}
    </>
  );
};

const EndCard: React.FC = () => {
  const f = useCurrentFrame();
  const a = edit.endAt;
  if (f < a - 4) return null;
  const t = k(f, a, a + 22, OUT);
  const out = k(f, edit.total - 22, edit.total);
  const rise = (d: number) => ({ opacity: k(f, a + d, a + d + 14, OUT), transform: `translateY(${(1 - k(f, a + d, a + d + 14, OUT)) * 14}px)` });
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', color: c.panel, fontFamily: fonts.sans, opacity: 1 - out, textAlign: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 32, opacity: t, transform: `scale(${0.92 + 0.08 * t})` }}>
        <Img src={staticFile('brand/logo-white.png')} style={{ height: 66 }} />
        <span style={{ fontSize: 92, fontWeight: 500, letterSpacing: '-0.03em' }}>Global Payouts</span>
      </div>
      <div style={{ marginTop: 40, fontSize: 40, lineHeight: 1.3, letterSpacing: '-0.015em', maxWidth: 1300, ...rise(14) }}>Banks in nine currencies, mobile money in Ghana, Kenya and Tanzania, and USDT or USDC wallets.</div>
      <div style={{ marginTop: 26, fontSize: 26, color: 'rgba(255,255,255,0.75)', ...rise(28) }}>Available to every verified Bachs account.</div>
    </AbsoluteFill>
  );
};

export const Payouts: React.FC = () => {
  const f = useCurrentFrame();
  const leave = k(f, edit.endAt - 20, edit.endAt + 4);
  return (
    <AbsoluteFill style={{ background: c.ground, overflow: 'hidden' }}>
      <style>{fontFaceCss}</style>
      <AbsoluteFill style={{ opacity: 1 - leave, filter: leave > 0 ? `blur(${leave * 5}px)` : undefined }}>
        <Img src={staticFile('brand/logo-white.png')} style={{ position: 'absolute', left: 122, top: 58, height: 30, opacity: k(f, 0, 20) }} />
        <div style={{ position: 'absolute', right: 120, top: 56, fontFamily: fonts.sans, fontSize: 20, color: 'rgba(255,255,255,0.8)', opacity: k(f, 0, 20) }}>Kanu &amp; Co. · Sandbox, test data</div>
        <Balances />
        <Destinations />
        <Panel />
        <Activity />
        <Slide />
        <Tap at={66} x={L.x + L.w - 28 - 60} y={BAL.y + BAL.h - 28 - 24} />
        {P.map((p) => (
          <Tap key={p.confirm} at={p.confirm} x={MID.x + MID.w / 2} y={MID.y + MID.h - 36 - 32} />
        ))}
        <Tap at={A.weekly} x={MID.x + MID.w - 36 - 150} y={MID.y + 170 + 76 + 38} />
        <Tap at={A.turnOn} x={MID.x + MID.w / 2} y={MID.y + MID.h - 36 - 32} />
        <Captions />
      </AbsoluteFill>
      <EndCard />
      <Audio src={staticFile('audio/payouts-mix.wav')} />
    </AbsoluteFill>
  );
};
