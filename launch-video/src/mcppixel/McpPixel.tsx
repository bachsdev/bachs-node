import React from 'react';
import { AbsoluteFill, Audio, Easing, Img, interpolate, random, staticFile, useCurrentFrame } from 'remotion';
import { px } from '../mcpstyle/PixelFrames';
import { fontFaceCss, fonts } from '../theme';
import edit from './edit.json';

// Bachs MCP launch, in the campaign language: the square as the unit, Geist
// Pixel for the big figures, Geist for what people say, Geist Mono for real
// data. Your account is a sea of records and a question pulls out the ones
// that answer it. Ten things you can now just ask, each answered with a
// picture of the answer, then the rest on the beat. Scenes change ground
// (paper, cobalt, navy) on bar lines through a wave of squares.

const B = edit.beatFrames;
const b = (n: number) => Math.round(n * B);
export const MCP_PIXEL_TOTAL = edit.total;

const OUT = Easing.bezier(0.05, 0.7, 0.1, 1);
const IO = Easing.bezier(0.4, 0, 0.2, 1);
const k = (f: number, a: number, z: number, easing = OUT) => interpolate(f, [a, z], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing });

type Ground = 'paper' | 'cobalt' | 'navy';
const GROUND: Record<Ground, string> = { paper: px.paper, cobalt: px.cobalt, navy: px.navy };
const isDark = (g: Ground) => g !== 'paper';

// ---------- shared pieces ----------

const Backdrop: React.FC<{ g: Ground }> = ({ g }) => {
  const f = useCurrentFrame();
  if (g === 'navy') {
    return (
      <AbsoluteFill style={{ background: px.navy }}>
        <AbsoluteFill style={{ background: `radial-gradient(55% 50% at ${32 + Math.sin(f / 50) * 6}% 38%, rgba(54,114,234,0.24), rgba(54,114,234,0) 70%)` }} />
        <AbsoluteFill style={{ backgroundImage: 'repeating-linear-gradient(to bottom, rgba(255,255,255,0.035) 0 2px, transparent 2px 5px)' }} />
      </AbsoluteFill>
    );
  }
  if (g === 'paper') {
    return (
      <AbsoluteFill style={{ background: px.paper }}>
        <AbsoluteFill style={{ backgroundImage: 'linear-gradient(rgba(54,114,234,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(54,114,234,0.06) 1px, transparent 1px)', backgroundSize: '72px 72px' }} />
      </AbsoluteFill>
    );
  }
  return <AbsoluteFill style={{ background: px.cobalt }} />;
};

const Header: React.FC<{ g: Ground; label: string }> = ({ g, label }) => (
  <>
    <Img src={staticFile(isDark(g) ? 'brand/logo-white.png' : 'brand/logo-black.png')} style={{ position: 'absolute', left: 120, top: 84, height: 32 }} />
    <div style={{ position: 'absolute', right: 120, top: 80, fontFamily: fonts.sans, fontSize: 32, color: isDark(g) ? 'rgba(255,255,255,0.72)' : px.muted }}>{label}</div>
  </>
);

// What the merchant asks: typed in, with a caret while it types.
const Ask: React.FC<{ text: string; at: number; g: Ground; size?: number; top?: number; mono?: boolean; width?: number }> = ({ text, at, g, size = 92, top = 200, mono, width = 1680 }) => {
  const f = useCurrentFrame();
  const n = Math.round(text.length * k(f, at, at + b(1.6), Easing.linear));
  const typing = n < text.length;
  const color = isDark(g) ? (mono ? px.sky : px.white) : px.ink;
  return (
    <div style={{ position: 'absolute', left: 120, top, width, fontFamily: mono ? fonts.mono : fonts.sans, fontWeight: mono ? 400 : 500, fontSize: size, lineHeight: 1.05, letterSpacing: mono ? '0' : '-0.035em', color }}>
      {mono && <span style={{ opacity: 0.55 }}>$ </span>}
      {!mono && '“'}
      {text.slice(0, n)}
      {typing ? <span style={{ display: 'inline-block', width: mono ? size * 0.55 : 5, height: size * 0.82, marginLeft: 4, verticalAlign: '-0.1em', background: color, opacity: 0.85 }} /> : !mono && '”'}
    </div>
  );
};

const Rise: React.FC<{ at: number; children: React.ReactNode; style?: React.CSSProperties; dist?: number }> = ({ at, children, style, dist = 28 }) => {
  const f = useCurrentFrame();
  const t = k(f, at, at + 10);
  return <div style={{ opacity: t, transform: `translateY(${(1 - t) * dist}px)`, ...style }}>{children}</div>;
};

const Pixel: React.FC<{ children: React.ReactNode; size: number; color: string; glow?: boolean; style?: React.CSSProperties }> = ({ children, size, color, glow, style }) => (
  <div style={{ fontFamily: fonts.pixel, fontSize: size, lineHeight: 1, letterSpacing: '-0.01em', color, textShadow: glow ? '0 0 28px rgba(120,160,255,0.65)' : undefined, whiteSpace: 'nowrap', ...style }}>{children}</div>
);

const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ borderRadius: 26, background: px.navy, boxShadow: '0 0 0 14px rgba(54,114,234,0.14), 0 30px 80px rgba(54,114,234,0.25)', padding: '40px 52px', fontFamily: fonts.mono, fontSize: 30, lineHeight: 1.55, color: px.white, ...style }}>{children}</div>
);

const Foot: React.FC<{ g: Ground; children: React.ReactNode }> = ({ g, children }) => (
  <div style={{ position: 'absolute', left: 120, right: 120, top: 990, fontFamily: fonts.sans, fontSize: 28, color: isDark(g) ? 'rgba(255,255,255,0.7)' : px.muted, display: 'flex', justifyContent: 'space-between' }}>{children}</div>
);

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

// ---------- the JSON wall: the account, as raw records ----------

const NAMES = ['Kwame Obi', 'Amina Addo', 'Kwame Ajayi', 'Femi Mensah', 'Nneka Ibrahim', 'Tunde Bello', 'Zainab Okoro', 'Kofi Asante', 'Chidi Eze', 'Halima Musa', 'Yaw Boateng', 'Ngozi Adeyemi'];
const ADA = '{ "id": "chrg_7c41e0a9d2", "reference": "order_4821", "status": "succeeded", "amount": "25000.00", "customer_name": "Ada Obi", "currency": "NGN", "transaction_date": "2026-10-21" }';
const record = (i: number) =>
  `{ "id": "chrg_${Math.floor(random(`i${i}`) * 0xfffffffff).toString(16).padStart(9, '0')}", "reference": "order_${1000 + Math.floor(random(`r${i}`) * 9000)}", "status": "${random(`s${i}`) > 0.2 ? 'succeeded' : 'pending'}", "amount": "${(Math.round(random(`a${i}`) * 80) * 500 + 2500).toFixed(2)}", "customer_name": "${NAMES[Math.floor(random(`n${i}`) * NAMES.length)]}", "currency": "NGN", "transaction_date": "2026-10-${String(1 + Math.floor(random(`d${i}`) * 26)).padStart(2, '0')}" }`;

const Wall: React.FC<{ speed: number; lit?: number; hitRow?: number }> = ({ speed, lit = 0, hitRow }) => {
  const LINE = 34;
  const rows = 40;
  return (
    <div style={{ position: 'absolute', left: -40, top: 0, fontFamily: fonts.mono, fontSize: 22, lineHeight: `${LINE}px`, whiteSpace: 'nowrap', color: 'rgba(28,29,43,0.12)', transform: `translateY(${-(speed % (LINE * 300))}px)` }}>
      {Array.from({ length: rows + Math.ceil(speed / LINE) + 2 }, (_, i) => {
        const hit = i === hitRow;
        const l = hit ? ADA : record(i);
        return (
          <div key={i} style={{ color: hit ? `rgba(54,114,234,${0.25 + 0.75 * lit})` : undefined, background: hit ? `rgba(54,114,234,${0.1 * lit})` : undefined, transform: `translateX(${-(i * 137) % 600}px)` }}>
            {l} {l}
          </div>
        );
      })}
    </div>
  );
};

// ---------- scenes ----------

type SceneProps = { at: number };
type Scene = { at: number; g: Ground; label: string; C: React.FC<SceneProps> };

const Hook: React.FC<SceneProps> = ({ at }) => {
  const f = useCurrentFrame();
  // The agent reading every record: the wall streams faster and faster into the drop.
  const t = (f - at) / b(16);
  const speed = 2400 * t * t * t + 260 * t;
  const blur = interpolate(t, [0.7, 1], [0, 6], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, filter: `blur(${blur}px)` }}>
        <Wall speed={speed} />
      </div>
      <Ask text="Find Ada Obi's payment." at={at + b(2)} g="paper" size={120} top={300} />
      <Rise at={at + b(8)} style={{ position: 'absolute', left: 120, top: 470, fontFamily: fonts.sans, fontSize: 52, letterSpacing: '-0.02em', color: px.ink }}>
        Somewhere in 300 payments.
      </Rise>
    </>
  );
};

const Title: React.FC<SceneProps> = ({ at }) => {
  const f = useCurrentFrame();
  const t = k(f, at, at + 16);
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 56, transform: `scale(${1.15 - 0.15 * t})`, opacity: t }}>
        <Img src={staticFile('brand/logo-white.png')} style={{ height: 96 }} />
        <Pixel size={190} color={px.white}>
          MCP
        </Pixel>
      </div>
      <Rise at={at + b(2)} style={{ marginTop: 56, fontFamily: fonts.sans, fontSize: 52, letterSpacing: '-0.02em', color: px.white }}>
        Your Bachs account, in Claude and ChatGPT.
      </Rise>
    </AbsoluteFill>
  );
};

const Find: React.FC<SceneProps> = ({ at }) => {
  const f = useCurrentFrame();
  const lit = k(f, at + b(1), at + b(2));
  return (
    <>
      <Wall speed={0} lit={lit} hitRow={19} />
      <div style={{ position: 'absolute', left: 120, top: 200, fontFamily: fonts.sans, fontWeight: 500, fontSize: 104, letterSpacing: '-0.035em', color: px.ink }}>“Find Ada Obi's payment.”</div>
      <Rise at={at + b(2)} dist={60} style={{ position: 'absolute', left: 120, right: 120, top: 520 }}>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.65)' }}>
            <span>search("Ada Obi")</span>
            <span style={{ color: px.sky }}>■ 1 call</span>
          </div>
          <div style={{ marginTop: 18 }}>
            {'{'}"customer_name": <span style={{ color: px.sky }}>"Ada Obi"</span>, "status": <span style={{ color: px.green }}>"succeeded"</span>,
            <br />
            &nbsp;"amount": <span style={{ color: px.sky }}>"25000.00"</span>, "currency": <span style={{ color: px.sky }}>"NGN"</span>, "reference": <span style={{ color: px.sky }}>"order_4821"</span>{'}'}
          </div>
        </Card>
      </Rise>
      <Rise at={at + b(4)} style={{ position: 'absolute', left: 120, top: 860, fontFamily: fonts.sans, fontSize: 48, letterSpacing: '-0.02em', color: px.ink }}>
        Paid. ₦25,000 by card on Oct 21.
      </Rise>
      <Foot g="paper">
        <span>One search across customers, payments and subscriptions.</span>
        <span>Sandbox, test data</span>
      </Foot>
    </>
  );
};

const Money: React.FC<SceneProps> = ({ at }) => {
  const f = useCurrentFrame();
  const count = k(f, at + b(2), at + b(4.5), Easing.bezier(0.2, 0.6, 0.2, 1));
  const COLS = 40;
  const ROWS = 6;
  const avail = 128;
  const settle = 31;
  const S = 31;
  const G = 9;
  return (
    <>
      <Ask text="How much money do I have, and what settles tomorrow?" at={at} g="cobalt" size={64} top={168} width={1300} />
      <div style={{ position: 'absolute', left: 112, top: 330, display: 'flex', alignItems: 'baseline', color: px.white, opacity: k(f, at + b(2), at + b(2.4)) }}>
        <span style={{ fontFamily: fonts.sans, fontSize: 140, marginRight: 10 }}>₦</span>
        <Pixel size={196} color={px.white}>
          {fmt(1284500 * count)}
        </Pixel>
      </div>
      <Rise at={at + b(3)} style={{ position: 'absolute', left: 120, top: 560, fontFamily: fonts.sans, fontSize: 48, letterSpacing: '-0.02em', color: px.white }}>
        available now, and ₦312,000 more lands tomorrow.
      </Rise>
      <div style={{ position: 'absolute', left: 120, top: 690, display: 'grid', gridTemplateColumns: `repeat(${COLS}, ${S}px)`, gap: G }}>
        {Array.from({ length: COLS * ROWS }, (_, i) => {
          const order = (i % COLS) * ROWS + Math.floor(i / COLS);
          const fill = at + b(3) + (order / (avail + settle)) * b(3);
          const shown = f >= fill;
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

const FAILED = [
  ['Kwame Ajayi', '₦18,500.00', 'Declined by the bank: insufficient funds'],
  ['Halima Musa', '₦7,500.00', 'Card expired'],
  ['Yaw Boateng', '$49.00', 'Customer didn’t finish 3-D Secure'],
];
const Failed: React.FC<SceneProps> = ({ at }) => (
  <>
    <Ask text="Which payments failed this week, and why?" at={at} g="paper" size={96} top={190} />
    {FAILED.map(([n, a, why], i) => (
      <Rise key={n} at={at + b(2.2 + i * 0.5)} dist={36} style={{ position: 'absolute', left: 120, right: 120, top: 470 + i * 140, height: 116, display: 'flex', alignItems: 'center', gap: 34, padding: '0 40px', background: px.white, borderRadius: 18, fontFamily: fonts.sans, fontSize: 40, color: px.ink }}>
        <span style={{ width: 26, height: 26, background: px.red }} />
        <span style={{ width: 380, fontWeight: 500 }}>{n}</span>
        <span style={{ width: 280, fontVariantNumeric: 'tabular-nums' }}>{a}</span>
        <span style={{ color: px.muted }}>{why}</span>
      </Rise>
    ))}
    <Foot g="paper">
      <span>Every failed payment, with the reason it failed.</span>
      <span>Sandbox, test data</span>
    </Foot>
  </>
);

const Disputes: React.FC<SceneProps> = ({ at }) => (
  <>
    <Ask text="Do I have disputes I need to respond to?" at={at} g="cobalt" size={88} top={190} />
    <Rise at={at + b(2)} style={{ position: 'absolute', left: 112, top: 340 }}>
      <Pixel size={250} color={px.white}>
        3 days
      </Pixel>
    </Rise>
    <Rise at={at + b(3)} style={{ position: 'absolute', left: 120, top: 640, width: 1500, fontFamily: fonts.sans, fontSize: 56, lineHeight: 1.18, letterSpacing: '-0.02em', color: px.white }}>
      to respond to Tunde Bello's $120.00 dispute for “product not received”. Evidence is due Oct 30.
    </Rise>
    <Foot g="cobalt">
      <span>Deadlines, evidence and early alerts, most urgent first.</span>
      <span>Sandbox, test data</span>
    </Foot>
  </>
);

const Payout: React.FC<SceneProps> = ({ at }) => (
  <>
    <Ask text="why did my last payout fail?" at={at} g="navy" size={44} top={210} mono />
    <Rise at={at + b(2)} style={{ position: 'absolute', left: 112, top: 310 }}>
      <Pixel size={240} color={px.sky} glow>
        PO-20263
      </Pixel>
    </Rise>
    <Rise at={at + b(3)} style={{ position: 'absolute', left: 120, top: 610, width: 1400, fontFamily: fonts.sans, fontSize: 66, lineHeight: 1.12, letterSpacing: '-0.025em', color: px.white }}>
      The name on the bank account doesn't match your business name.
    </Rise>
    <Rise at={at + b(4)} style={{ position: 'absolute', left: 120, right: 120, top: 880, display: 'flex', justifyContent: 'space-between', fontFamily: fonts.mono, fontSize: 30, color: 'rgba(255,255,255,0.7)' }}>
      <span>₦450,000.00 · GTBank •••• 4410 · Oct 25</span>
      <span>
        <span style={{ color: px.green }}>✓</span> 1 call <span style={{ color: px.cobaltLift }}>■</span>
      </span>
    </Rise>
  </>
);

const Compliance: React.FC<SceneProps> = ({ at }) => {
  const items: [string, boolean][] = [
    ['Business details', true],
    ['Director ID', true],
    ['Bank account', true],
    ['Proof of address', false],
  ];
  return (
    <>
      <Ask text="Why can't I get paid out?" at={at} g="paper" size={110} top={190} />
      <div style={{ position: 'absolute', left: 120, top: 400, width: 820 }}>
        {items.map(([t, ok], i) => (
          <Rise key={t} at={at + b(2 + i * 0.5)} style={{ display: 'flex', alignItems: 'center', gap: 26, height: 100, marginBottom: 14, padding: '0 34px', borderRadius: 18, background: ok ? px.white : px.cobalt, color: ok ? px.ink : px.white, fontFamily: fonts.sans, fontSize: 40 }}>
            <span style={{ width: 30, height: 30, boxSizing: 'border-box', background: ok ? px.cobalt : 'transparent', border: ok ? undefined : `4px solid ${px.white}` }} />
            {t}
            <span style={{ marginLeft: 'auto', fontSize: 30, opacity: 0.75 }}>{ok ? 'Approved' : 'Still needed'}</span>
          </Rise>
        ))}
      </div>
      <Rise at={at + b(4.5)} style={{ position: 'absolute', left: 1020, top: 430, width: 780, fontFamily: fonts.sans, fontSize: 56, lineHeight: 1.18, letterSpacing: '-0.02em', color: px.ink }}>
        One thing left: upload a proof of address, and your payouts can go through.
      </Rise>
      <Foot g="paper">
        <span>What's blocking your account, and what to send.</span>
        <span>Sandbox, test data</span>
      </Foot>
    </>
  );
};

const INVOICES = [
  ['INV-0193', 'Lekki Studios', '₦120,000.00', 'Due Nov 2'],
  ['INV-0201', 'Kofi Asante', '₦65,000.00', 'Due Nov 5'],
  ['INV-0207', 'Brightwave Ltd', '₦50,000.00', 'Overdue'],
];
const Invoices: React.FC<SceneProps> = ({ at }) => {
  const f = useCurrentFrame();
  const c = k(f, at + b(4), at + b(5.5), Easing.bezier(0.2, 0.6, 0.2, 1));
  return (
    <>
      <Ask text="Show my open invoices, and what I'm owed." at={at} g="cobalt" size={84} top={190} />
      {INVOICES.map(([id, who, amt, due], i) => (
        <Rise key={id} at={at + b(2 + i * 0.5)} dist={36} style={{ position: 'absolute', left: 120, width: 1060, top: 360 + i * 128, height: 108, display: 'flex', alignItems: 'center', gap: 30, padding: '0 36px', background: 'rgba(255,255,255,0.12)', borderRadius: 16, fontFamily: fonts.sans, fontSize: 38, color: px.white }}>
          <span style={{ fontFamily: fonts.mono, fontSize: 30, opacity: 0.75, width: 190 }}>{id}</span>
          <span style={{ width: 300 }}>{who}</span>
          <span style={{ width: 280, fontVariantNumeric: 'tabular-nums' }}>{amt}</span>
          <span style={{ marginLeft: 'auto', fontSize: 30, whiteSpace: 'nowrap', opacity: due === 'Overdue' ? 1 : 0.75, fontWeight: due === 'Overdue' ? 600 : 400 }}>{due}</span>
        </Rise>
      ))}
      <Rise at={at + b(4)} style={{ position: 'absolute', left: 1240, top: 360, color: px.white }}>
        <div style={{ fontFamily: fonts.sans, fontSize: 40 }}>Owed to you</div>
        <Pixel size={112} color={px.white} style={{ marginTop: 14 }}>
          ₦{fmt(235000 * c)}
        </Pixel>
      </Rise>
      <Foot g="cobalt">
        <span>Customers, saved cards, subscriptions, invoices and products.</span>
        <span>Sandbox, test data</span>
      </Foot>
    </>
  );
};

const Webhooks: React.FC<SceneProps> = ({ at }) => {
  const f = useCurrentFrame();
  const N = 43;
  return (
    <>
      <Ask text="are my webhooks failing?" at={at} g="navy" size={44} top={210} mono />
      <div style={{ position: 'absolute', left: 120, top: 330, display: 'flex', gap: 10, flexWrap: 'wrap', width: 1700 }}>
        {Array.from({ length: N }, (_, i) => {
          const shown = f >= at + b(2) + i * 1.2;
          const bad = i >= 40;
          return <div key={i} style={{ width: 30, height: 30, boxSizing: 'border-box', background: shown ? (bad ? 'transparent' : px.cobaltLift) : 'rgba(255,255,255,0.06)', border: shown && bad ? `4px solid ${px.red}` : undefined, boxShadow: shown && bad ? '0 0 16px rgba(255,107,94,0.6)' : undefined }} />;
        })}
      </div>
      <Rise at={at + b(4)} style={{ position: 'absolute', left: 112, top: 420 }}>
        <Pixel size={210} color={px.red} glow>
          3 failed
        </Pixel>
      </Rise>
      <Rise at={at + b(4.5)} style={{ position: 'absolute', left: 120, top: 680, width: 1500, fontFamily: fonts.sans, fontSize: 60, lineHeight: 1.14, letterSpacing: '-0.025em', color: px.white }}>
        Since 09:12 your endpoint has returned 500 for checkout.completed. The 40 before that arrived.
      </Rise>
      <Foot g="navy">
        <span>Every event sent, whether it arrived, and what your endpoint said.</span>
        <span>Sandbox, test data</span>
      </Foot>
    </>
  );
};

const ApiLog: React.FC<SceneProps> = ({ at }) => (
  <>
    <Ask text="Why did my API call fail this morning?" at={at} g="paper" size={96} top={190} />
    <Rise at={at + b(2)} dist={60} style={{ position: 'absolute', left: 120, width: 1100, top: 380 }}>
      <Card style={{ fontSize: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.65)' }}>
          <span>POST /v1/checkout-sessions</span>
          <span style={{ color: px.red }}>422 · 08:41</span>
        </div>
        <div style={{ marginTop: 18 }}>
          {'{'}"error": <span style={{ color: px.sky }}>"product not found"</span>,
          <br />
          &nbsp;"field": <span style={{ color: px.sky }}>"product_cart[0].product_id"</span>,
          <br />
          &nbsp;"value": <span style={{ color: px.red }}>"prod_credit_pak"</span>{'}'}
        </div>
      </Card>
    </Rise>
    <Rise at={at + b(3.5)} style={{ position: 'absolute', left: 1300, top: 400, width: 500, fontFamily: fonts.sans, fontSize: 54, lineHeight: 1.16, letterSpacing: '-0.02em', color: px.ink }}>
      A typo: it should be prod_credit_pack.
    </Rise>
    <Foot g="paper">
      <span>Your own API calls, with the error for any that failed.</span>
      <span>Sandbox, test data</span>
    </Foot>
  </>
);

const Docs: React.FC<SceneProps> = ({ at }) => {
  const f = useCurrentFrame();
  const code = ["const session = await bachs.checkoutSessions.create({", "  product_cart: [{ product_id: 'prod_credit_pack', quantity: 1 }],", "  success_url: 'https://snapkit.bachs.io/welcome',", '});'];
  const shown = Math.round(code.join('\n').length * k(f, at + b(2.5), at + b(5.5), Easing.linear));
  let left = shown;
  return (
    <>
      <Ask text="How do I create a checkout session?" at={at} g="cobalt" size={96} top={190} />
      <Rise at={at + b(2)} dist={60} style={{ position: 'absolute', left: 120, right: 120, top: 380 }}>
        <Card style={{ fontSize: 30 }}>
          <div style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 14 }}>From the Bachs docs · Node.js</div>
          {code.map((l, i) => {
            const t = l.slice(0, Math.max(0, left));
            left -= l.length + 1;
            return <div key={i} style={{ minHeight: '1.55em', whiteSpace: 'pre' }}>{t}</div>;
          })}
        </Card>
      </Rise>
      <Foot g="cobalt">
        <span>Search and read the Bachs docs. That part needs no sign-in.</span>
        <span>docs.bachs.io</span>
      </Foot>
    </>
  );
};

const RAPID = [
  'Naira balance available?',
  'How many payouts failed?',
  'Disputes due, most urgent?',
  'Dispute win rate?',
  'Which refunds are pending?',
  "Ada Obi's subscriptions?",
  'How healthy are my payments?',
  'Last 3 failed customers?',
  'Who paid ord_255y?',
  'Which currencies do I hold?',
  'Active payment links?',
  'Most expensive product?',
  'Which payouts are pending?',
  "'Workshop ticket' earnings?",
  'Payouts restricted. Fix?',
  'Open invoices, total owed?',
];
const Rapid: React.FC<SceneProps> = ({ at }) => {
  const f = useCurrentFrame();
  return (
    <>
      <div style={{ position: 'absolute', left: 120, top: 180, fontFamily: fonts.sans, fontWeight: 500, fontSize: 84, letterSpacing: '-0.035em', color: px.white }}>And everything else you'd look up.</div>
      <div style={{ position: 'absolute', left: 120, right: 120, top: 340, display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 80, rowGap: 6, fontFamily: fonts.mono, fontSize: 34 }}>
        {RAPID.map((q, i) => {
          const at2 = at + b(0.6 + i * 0.42);
          const on = f >= at2;
          const t = k(f, at2, at2 + 6);
          return (
            <div key={q} style={{ display: 'flex', alignItems: 'center', gap: 18, height: 66, color: px.white, opacity: on ? 0.35 + 0.65 * t : 0.18 }}>
              <span style={{ color: px.green, opacity: t }}>✓</span>
              <span>{q}</span>
              <span style={{ marginLeft: 'auto', width: 16, height: 16, background: on ? px.cobaltLift : 'transparent', border: on ? undefined : '2px solid rgba(255,255,255,0.3)' }} />
            </div>
          );
        })}
      </div>
      <Rise at={at + b(7)} style={{ position: 'absolute', left: 120, top: 990, fontFamily: fonts.sans, fontSize: 30, color: 'rgba(255,255,255,0.75)' }}>
        In our tests, Claude answered all 20 merchant questions correctly.
      </Rise>
    </>
  );
};

const Trust: React.FC<SceneProps> = ({ at }) => (
  <>
    <Rise at={at} style={{ position: 'absolute', left: 112, top: 230 }}>
      <Pixel size={230} color={px.cobalt}>
        Read-only.
      </Pixel>
    </Rise>
    <Rise at={at + b(1.5)} style={{ position: 'absolute', left: 120, top: 500, fontFamily: fonts.sans, fontSize: 64, letterSpacing: '-0.025em', color: px.ink }}>
      It can't move money or change anything.
    </Rise>
    <div style={{ position: 'absolute', left: 120, top: 680, display: 'flex', gap: 20 }}>
      {['Disconnect it any time', 'Card numbers stay hidden', 'Sandbox answers say test data'].map((t, i) => (
        <Rise key={t} at={at + b(3 + i)} style={{ padding: '24px 34px', borderRadius: 18, background: px.white, fontFamily: fonts.sans, fontSize: 36, color: px.ink, display: 'flex', alignItems: 'center', gap: 18 }}>
          <span style={{ width: 22, height: 22, background: px.cobalt }} />
          {t}
        </Rise>
      ))}
    </div>
  </>
);

const Connect: React.FC<SceneProps> = ({ at }) => (
  <>
    <div style={{ position: 'absolute', left: 120, top: 190, fontFamily: fonts.sans, fontWeight: 500, fontSize: 104, letterSpacing: '-0.035em', color: px.white }}>Connected in about a minute.</div>
    {[
      ['Copy your link', 'Developers › Connected apps', 'mcp.bachs.io/mcp'],
      ['Add it to your AI app', 'Claude, ChatGPT and others', 'Custom connector'],
      ['Sign in and allow', 'No API key to paste', 'Allow'],
    ].map(([t, s, chip], i) => (
      <Rise key={t} at={at + b(1.5 + i * 1.5)} dist={40} style={{ position: 'absolute', left: 120 + i * 570, top: 420, width: 540, height: 420, padding: '40px 40px', boxSizing: 'border-box', borderRadius: 22, background: px.white, fontFamily: fonts.sans, color: px.ink }}>
        <Pixel size={90} color={px.cobalt}>
          {i + 1}
        </Pixel>
        <div style={{ marginTop: 40, fontSize: 46, fontWeight: 500, letterSpacing: '-0.02em' }}>{t}</div>
        <div style={{ marginTop: 10, fontSize: 30, color: px.muted }}>{s}</div>
        <div style={{ position: 'absolute', left: 40, bottom: 40, padding: '10px 18px', borderRadius: 10, background: i === 2 ? px.ink : px.paper, color: i === 2 ? px.white : px.ink, fontFamily: i === 0 ? fonts.mono : fonts.sans, fontSize: 26 }}>{chip}</div>
      </Rise>
    ))}
  </>
);

const Works: React.FC<SceneProps> = ({ at }) => (
  <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
    <Rise at={at} style={{ fontFamily: fonts.sans, fontSize: 48, color: 'rgba(255,255,255,0.7)' }}>
      Works with
    </Rise>
    <div style={{ display: 'flex', gap: 80, marginTop: 30 }}>
      {['Claude', 'ChatGPT'].map((n, i) => (
        <Rise key={n} at={at + b(1 + i)}>
          <Pixel size={180} color={px.sky} glow>
            {n}
          </Pixel>
        </Rise>
      ))}
    </div>
    <Rise at={at + b(3)} style={{ marginTop: 40, fontFamily: fonts.sans, fontSize: 48, color: px.white }}>
      and other apps that support MCP. Live and sandbox.
    </Rise>
  </AbsoluteFill>
);

const Tagline: React.FC<SceneProps> = ({ at }) => (
  <>
    <Rise at={at} style={{ position: 'absolute', left: 120, top: 300, width: 1700, fontFamily: fonts.sans, fontWeight: 500, fontSize: 132, lineHeight: 1.0, letterSpacing: '-0.04em', color: px.white }}>
      Almost everything in your dashboard,
    </Rise>
    <Rise at={at + b(2)} style={{ position: 'absolute', left: 120, top: 580, fontFamily: fonts.sans, fontWeight: 500, fontSize: 132, letterSpacing: '-0.04em', color: px.white }}>
      in a conversation.
    </Rise>
  </>
);

const Logo: React.FC<SceneProps> = ({ at }) => {
  const f = useCurrentFrame();
  const t = k(f, at, at + 18);
  const out = k(f, edit.total - 22, edit.total, IO);
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: 1 - out }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 50, transform: `scale(${1.12 - 0.12 * t})`, opacity: t }}>
        <Img src={staticFile('brand/logo-white.png')} style={{ height: 90 }} />
        <Pixel size={180} color={px.sky} glow>
          MCP
        </Pixel>
      </div>
      <Rise at={at + b(2)} style={{ marginTop: 56, fontFamily: fonts.sans, fontSize: 40, color: 'rgba(255,255,255,0.75)' }}>
        Find it in Developers › Connected apps
      </Rise>
    </AbsoluteFill>
  );
};

// Every scene starts on a bar line: the hook takes the four bars before the drop, then two bars each.
const SCENES: Scene[] = [
  { at: 0, g: 'paper', label: 'Bachs MCP', C: Hook },
  { at: b(16), g: 'cobalt', label: '', C: Title },
  { at: b(24), g: 'paper', label: 'Find anything', C: Find },
  { at: b(32), g: 'cobalt', label: 'Balances', C: Money },
  { at: b(40), g: 'paper', label: 'Payments', C: Failed },
  { at: b(48), g: 'cobalt', label: 'Disputes', C: Disputes },
  { at: b(56), g: 'navy', label: 'Payouts', C: Payout },
  { at: b(64), g: 'paper', label: 'Compliance', C: Compliance },
  { at: b(72), g: 'cobalt', label: 'Billing', C: Invoices },
  { at: b(80), g: 'navy', label: 'Webhooks', C: Webhooks },
  { at: b(88), g: 'paper', label: 'API logs', C: ApiLog },
  { at: b(96), g: 'cobalt', label: 'Docs', C: Docs },
  { at: b(104), g: 'navy', label: 'Bachs MCP', C: Rapid },
  { at: b(112), g: 'paper', label: 'Safe by design', C: Trust },
  { at: b(120), g: 'cobalt', label: 'Connect', C: Connect },
  { at: b(128), g: 'navy', label: '', C: Works },
  { at: b(136), g: 'cobalt', label: '', C: Tagline },
  { at: b(144), g: 'navy', label: '', C: Logo },
];

// The hand-off: squares flip in a diagonal wave in the next scene's ground, cover the cut, and flip away.
const CELL = 80;
const PixelWipe: React.FC<{ at: number; color: string }> = ({ at, color }) => {
  const f = useCurrentFrame();
  if (f < at - 12 || f > at + 12) return null;
  const cols = Math.ceil(1920 / CELL);
  const rows = Math.ceil(1080 / CELL);
  const cells = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const d = (x + y) / (cols + rows - 2); // 0 at top-left, 1 at bottom-right
      const jitter = random(`w${at}-${x}-${y}`) * 0.18;
      const inK = k(f, at - 11 + (d + jitter) * 6, at - 11 + (d + jitter) * 6 + 4, IO);
      const outK = k(f, at + 1 + (d + jitter) * 6, at + 1 + (d + jitter) * 6 + 4, IO);
      const s = inK * (1 - outK);
      if (s <= 0.001) continue;
      cells.push(<div key={`${x}-${y}`} style={{ position: 'absolute', left: x * CELL, top: y * CELL, width: CELL, height: CELL, background: color, transform: `scale(${s * 1.02})` }} />);
    }
  }
  return <AbsoluteFill>{cells}</AbsoluteFill>;
};

export const McpPixel: React.FC = () => {
  const f = useCurrentFrame();
  const i = Math.max(0, SCENES.filter((s) => f >= s.at).length - 1);
  const sc = SCENES[i];
  const end = SCENES[i + 1]?.at ?? edit.total;
  const drift = 1 + 0.025 * k(f, sc.at, end, IO);
  return (
    <AbsoluteFill style={{ background: GROUND[sc.g], overflow: 'hidden' }}>
      <style>{fontFaceCss}</style>
      <Backdrop g={sc.g} />
      <AbsoluteFill style={{ transform: `scale(${drift})` }}>
        <sc.C at={sc.at} />
      </AbsoluteFill>
      {sc.label && <Header g={sc.g} label={sc.label} />}
      {SCENES.slice(1).map((s) => (
        <PixelWipe key={s.at} at={s.at} color={GROUND[s.g]} />
      ))}
      <Audio src={staticFile('audio/mcppixel-mix.wav')} />
    </AbsoluteFill>
  );
};
