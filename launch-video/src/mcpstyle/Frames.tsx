import React from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';
import { Grain } from '../components';
import { fontFaceCss } from '../theme';
import { display, displayFontCss } from './fonts';

// Three art directions for the Bachs MCP launch, each on the same moment:
// "Why did my last payout fail?" answered. In every one the answer is a
// designed graphic, not a chat window.

const Q = 'Why did my last payout fail?';

const Fonts: React.FC = () => (
  <style>
    {fontFaceCss}
    {displayFontCss}
  </style>
);

// ---------- A · Ledger: paper, ink and a rubber stamp ----------

const paper = '#f2ede3';
const ink = '#17193b';
const stampRed = '#d23f2c';

const Receipt: React.FC = () => {
  const zig = Array.from({ length: 27 }, (_, i) => `${100 - (i / 26) * 100}% ${i % 2 ? 97 : 100}%`).join(', ');
  const Row: React.FC<{ k: string; v: string; strong?: boolean }> = ({ k, v, strong }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', fontSize: 24, fontWeight: strong ? 600 : 400 }}>
      <span style={{ color: '#7a7768' }}>{k}</span>
      <span>{v}</span>
    </div>
  );
  return (
    <div style={{ position: 'absolute', left: 1250, top: 150, width: 520, transform: 'rotate(3.2deg)', filter: 'drop-shadow(0 30px 40px rgba(60,50,30,0.22))' }}>
      <div style={{ background: '#fffdf7', padding: '44px 40px 70px', clipPath: `polygon(0 0, 100% 0, ${zig})`, fontFamily: display.mono, color: '#2a2a26' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Img src={staticFile('brand/logo-black.png')} style={{ height: 20 }} />
          <span style={{ fontSize: 18, letterSpacing: '0.12em', color: '#7a7768' }}>PAYOUT</span>
        </div>
        <div style={{ margin: '22px 0 12px', borderTop: '2px dashed #cfcabb' }} />
        <Row k="AMOUNT" v="₦450,000.00" strong />
        <Row k="DATE" v="25 OCT 2026" />
        <Row k="TO" v="GTBank •••• 4410" />
        <Row k="STATUS" v="FAILED" />
        <div style={{ margin: '14px 0', borderTop: '2px dashed #cfcabb' }} />
        <div style={{ fontSize: 20, lineHeight: 1.5, color: '#55534a' }}>The name on the bank account doesn't match your business name.</div>
      </div>
      {/* the stamp */}
      <div
        style={{
          position: 'absolute',
          left: 120,
          top: 470,
          transform: 'rotate(-11deg)',
          padding: '14px 26px',
          border: `5px solid ${stampRed}`,
          borderRadius: 10,
          color: stampRed,
          fontFamily: display.mono,
          fontWeight: 600,
          fontSize: 40,
          letterSpacing: '0.06em',
          whiteSpace: 'nowrap',
          mixBlendMode: 'multiply',
          opacity: 0.88,
          maskImage: 'repeating-radial-gradient(circle at 30% 40%, #000 0 2px, rgba(0,0,0,0.75) 2px 3px)',
          WebkitMaskImage: 'repeating-radial-gradient(circle at 30% 40%, #000 0 2px, rgba(0,0,0,0.75) 2px 3px)',
        }}
      >
        NAME MISMATCH
      </div>
      <div style={{ position: 'absolute', right: -26, top: -24, transform: 'rotate(9deg)', padding: '6px 14px', border: '3px solid #3550c8', borderRadius: 8, color: '#3550c8', fontFamily: display.mono, fontWeight: 600, fontSize: 20, letterSpacing: '0.1em', mixBlendMode: 'multiply' }}>
        TEST DATA
      </div>
    </div>
  );
};

export const FrameLedger: React.FC = () => (
  <AbsoluteFill style={{ background: paper }}>
    <Fonts />
    {/* ledger rules and margin */}
    <AbsoluteFill style={{ backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0 53px, rgba(80,110,170,0.22) 53px 54px)', backgroundPosition: '0 26px' }} />
    <div style={{ position: 'absolute', top: 0, bottom: 0, left: 196, width: 2, background: 'rgba(200,90,80,0.35)' }} />
    <div style={{ position: 'absolute', top: 0, bottom: 0, left: 202, width: 2, background: 'rgba(200,90,80,0.35)' }} />
    <AbsoluteFill style={{ background: 'radial-gradient(120% 90% at 40% 40%, rgba(255,255,255,0) 55%, rgba(120,95,50,0.14) 100%)' }} />

    <div style={{ position: 'absolute', left: 250, top: 72, right: 120, display: 'flex', justifyContent: 'space-between', fontFamily: display.mono, fontSize: 19, letterSpacing: '0.14em', color: '#6b6656' }}>
      <span>BACHS MCP · ASKED IN PLAIN WORDS</span>
    </div>
    <div style={{ position: 'absolute', left: 250, top: 196, width: 940 }}>
      <div style={{ fontFamily: display.mono, fontSize: 22, letterSpacing: '0.14em', color: stampRed }}>Q. 04 — PAYOUTS</div>
      <div style={{ marginTop: 18, fontFamily: display.serif, fontSize: 132, lineHeight: 0.98, letterSpacing: '-0.02em', color: ink }}>
        Why did my last payout <span style={{ fontStyle: 'italic' }}>fail?</span>
      </div>
      <div style={{ marginTop: 56, fontFamily: display.serif, fontSize: 46, lineHeight: 1.25, color: ink }}>
        Because{' '}
        <span style={{ background: 'linear-gradient(transparent 52%, rgba(82,102,235,0.30) 52%, rgba(82,102,235,0.30) 92%, transparent 92%)' }}>
          the name on the bank account doesn't match your business name.
        </span>
      </div>
      <div style={{ marginTop: 44, fontFamily: display.mono, fontSize: 19, letterSpacing: '0.1em', color: '#6b6656' }}>ANSWERED BY CLAUDE · READ-ONLY · 1 STEP</div>
    </div>
    <Receipt />
    <Grain />
  </AbsoluteFill>
);

// ---------- B · Signal: a colour field per area, the answer as a diagram ----------

const AREA_COLORS = ['#7a87ff', '#2fd4a0', '#ffc23d', '#ff5b36', '#ff3f8e', '#9b5cff', '#3dc7ff', '#c6f432', '#f4f4f6'];

export const FrameSignal: React.FC = () => {
  const deep = '#1c0a26';
  return (
    <AbsoluteFill style={{ background: 'linear-gradient(125deg, #ff6a3a 0%, #ff4560 55%, #ff2f86 100%)' }}>
      <Fonts />
      <AbsoluteFill style={{ background: 'radial-gradient(40% 50% at 88% 12%, rgba(255,196,80,0.75), rgba(255,196,80,0) 70%), radial-gradient(45% 60% at 8% 95%, rgba(120,20,90,0.45), rgba(120,20,90,0) 70%)' }} />
      <div style={{ position: 'absolute', left: 110, top: 70, right: 110, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ padding: '10px 20px', borderRadius: 999, border: `2px solid ${deep}`, fontFamily: display.mono, fontWeight: 600, fontSize: 20, letterSpacing: '0.12em', color: deep }}>PAYOUTS</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Img src={staticFile('brand/logo-black.png')} style={{ height: 24, opacity: 0.9 }} />
          <span style={{ fontFamily: display.grotesk, fontWeight: 700, fontSize: 30, color: deep }}>MCP</span>
        </span>
      </div>
      <div style={{ position: 'absolute', left: 104, top: 170, width: 1500, fontFamily: display.grotesk, fontWeight: 800, fontSize: 178, lineHeight: 0.94, letterSpacing: '-0.04em', wordSpacing: '0.08em', color: deep }}>
        Why did my last payout fail?
      </div>
      {/* the payout's path, broken at the bank */}
      <div style={{ position: 'absolute', left: 110, right: 110, top: 600, height: 200 }}>
        <div style={{ position: 'absolute', left: 60, right: 60, top: 58, borderTop: `5px solid ${deep}` }} />
        <div style={{ position: 'absolute', left: '62%', width: '20%', top: 54, height: 14, background: 'linear-gradient(125deg, #ff4f55, #ff3b74)' }} />
        <div style={{ position: 'absolute', left: '62%', width: '20%', top: 58, borderTop: `5px dashed ${deep}`, opacity: 0.45 }} />
        {[
          { x: '0%', label: 'Bachs', sub: '₦450,000.00 · Oct 25' },
          { x: '100%', label: 'GTBank •••• 4410', sub: 'Your payout account' },
        ].map((n, i) => (
          <div key={i} style={{ position: 'absolute', left: n.x, top: 0, transform: `translateX(${i ? '-100%' : '0'})`, textAlign: i ? 'right' : 'left', whiteSpace: 'nowrap' }}>
            <div style={{ width: 120, height: 120, borderRadius: 60, background: deep, marginLeft: i ? 'auto' : 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 36, height: 36, borderRadius: 18, background: i ? '#ff6a3a' : '#f4ede4' }} />
            </div>
            <div style={{ marginTop: 18, fontFamily: display.grotesk, fontWeight: 700, fontSize: 36, color: deep }}>{n.label}</div>
            <div style={{ fontFamily: display.mono, fontSize: 20, color: 'rgba(28,10,38,0.7)' }}>{n.sub}</div>
          </div>
        ))}
        <div style={{ position: 'absolute', left: '72%', top: 0, transform: 'translateX(-50%)', textAlign: 'center' }}>
          <div style={{ width: 120, height: 120, borderRadius: 60, background: '#fff3ea', border: `5px solid ${deep}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', fontFamily: display.grotesk, fontWeight: 800, fontSize: 64, color: deep }}>✕</div>
          <div style={{ marginTop: 120, padding: '14px 22px', borderRadius: 14, background: deep, color: '#fff3ea', fontFamily: display.grotesk, fontWeight: 600, fontSize: 30, whiteSpace: 'nowrap' }}>Name on account ≠ business name</div>
        </div>
      </div>
      {/* nine areas, nine colours; this one lit */}
      <div style={{ position: 'absolute', left: 110, right: 110, bottom: 56, display: 'flex', alignItems: 'center', gap: 10 }}>
        {AREA_COLORS.map((col, i) => (
          <div key={i} style={{ flex: 1, height: 8, borderRadius: 4, background: i === 3 ? deep : 'rgba(28,10,38,0.18)' }} />
        ))}
        <span style={{ marginLeft: 18, padding: '6px 12px', borderRadius: 8, border: `2px solid ${deep}`, fontFamily: display.mono, fontWeight: 600, fontSize: 17, letterSpacing: '0.1em', color: deep }}>TEST DATA</span>
      </div>
      <Grain />
      <Grain />
    </AbsoluteFill>
  );
};

// ---------- C · Riso: two inks overprinting on cream ----------

const cream = '#f3eee2';
const blue = '#3a4be0';
const pink = '#ff4fa3';

const Halftone: React.FC<{ color: string; size: number; style: React.CSSProperties }> = ({ color, size, style }) => (
  <div style={{ position: 'absolute', borderRadius: '50%', backgroundImage: `radial-gradient(circle, ${color} 38%, transparent 40%)`, backgroundSize: `${size}px ${size}px`, mixBlendMode: 'multiply', ...style }} />
);

const Overprint: React.FC<{ children: React.ReactNode; style: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ position: 'absolute', ...style }}>
    <div style={{ color: pink, mixBlendMode: 'multiply', transform: 'translate(7px, 5px)' }}>{children}</div>
    <div style={{ position: 'absolute', inset: 0, color: blue, mixBlendMode: 'multiply' }}>{children}</div>
  </div>
);

export const FrameRiso: React.FC = () => (
  <AbsoluteFill style={{ background: cream, overflow: 'hidden' }}>
    <Fonts />
    <Halftone color={pink} size={18} style={{ width: 860, height: 860, right: -260, top: 120 }} />
    <Halftone color={blue} size={14} style={{ width: 380, height: 380, right: 380, bottom: -250, opacity: 0.7 }} />
    <div style={{ position: 'absolute', left: 110, top: 70, right: 110, display: 'flex', justifyContent: 'space-between', fontFamily: display.mono, fontWeight: 600, fontSize: 20, letterSpacing: '0.14em', color: blue }}>
      <span>BACHS MCP</span>
      <span>Nº 04 · PAYOUTS</span>
    </div>
    <Overprint style={{ left: 100, top: 150, width: 1300, fontFamily: display.grotesk, fontWeight: 800, fontSize: 168, lineHeight: 0.92, letterSpacing: '-0.04em', wordSpacing: '0.08em' }}>
      Why did my last payout fail?
    </Overprint>
    {/* the mismatch itself */}
    <div style={{ position: 'absolute', left: 110, top: 640, display: 'flex', alignItems: 'center', gap: 44 }}>
      {[
        ['NAME ON THE BANK ACCOUNT', 'SNAPKIT DIGITAL'],
        ['YOUR BUSINESS NAME', 'SnapKit Ltd'],
      ].map(([k, v], i) => (
        <React.Fragment key={k}>
          {i === 1 && <div style={{ fontFamily: display.grotesk, fontWeight: 800, fontSize: 150, color: pink, mixBlendMode: 'multiply', lineHeight: 1 }}>≠</div>}
          <div style={{ padding: '26px 34px', border: `4px solid ${blue}`, borderRadius: 18, transform: `rotate(${i ? 2 : -2}deg)`, background: i ? 'transparent' : 'rgba(255,79,163,0.18)' }}>
            <div style={{ fontFamily: display.mono, fontWeight: 600, fontSize: 18, letterSpacing: '0.12em', color: blue }}>{k}</div>
            <div style={{ marginTop: 10, fontFamily: display.grotesk, fontWeight: 700, fontSize: 56, letterSpacing: '-0.03em', color: blue }}>{v}</div>
          </div>
        </React.Fragment>
      ))}
    </div>
    <div style={{ position: 'absolute', left: 110, right: 110, bottom: 70, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: display.mono, fontSize: 21, color: blue }}>
      <span>₦450,000.00 to GTBank •••• 4410 · 25 Oct · failed</span>
      <span style={{ padding: '6px 14px', border: `3px solid ${pink}`, borderRadius: 8, color: pink, fontWeight: 600, letterSpacing: '0.1em', background: cream, position: 'relative' }}>TEST DATA</span>
    </div>
    <AbsoluteFill style={{ opacity: 0.5, mixBlendMode: 'multiply', backgroundImage: 'radial-gradient(rgba(60,40,20,0.10) 1px, transparent 1.4px)', backgroundSize: '5px 5px' }} />
    <Grain />
  </AbsoluteFill>
);

