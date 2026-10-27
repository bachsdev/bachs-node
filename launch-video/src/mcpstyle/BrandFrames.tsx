import React from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';
import { Grain } from '../components';
import { fontFaceCss, fonts } from '../theme';

// The Bachs blog and homepage language, as styleframes for the MCP launch:
// a light canvas with guide lines, the skewed cobalt band with currencies in
// transit, kicker + Geist Regular headlines, the homepage's stamped receipt,
// and cobalt cover art with isometric line drawings.

export const brand = {
  canvas: '#fbfcfd',
  ink: '#1e1e2a',
  text: '#272735',
  subdued: '#535461',
  indigo: '#5266eb', // product UI
  cobalt: '#3070e8', // blog cover art
  line: 'rgba(112,115,147,0.12)',
  stamp: '#d6452f',
};

const Guides: React.FC<{ color?: string }> = ({ color = brand.line }) => (
  <>
    {[160, 640, 1280, 1760].map((x) => (
      <div key={x} style={{ position: 'absolute', top: 0, bottom: 0, left: x, width: 1, background: color }} />
    ))}
  </>
);

// The blog's skewed band: cobalt into indigo, with dashed routes and currencies riding them.
const Band: React.FC = () => (
  <div style={{ position: 'absolute', left: -200, right: -200, top: 430, height: 420, transform: 'skewY(-9deg)', background: `linear-gradient(100deg, ${brand.cobalt} 0%, #4467ee 55%, ${brand.indigo} 100%)`, overflow: 'hidden' }}>
    {[90, 210, 330].map((y, i) => (
      <div key={y} style={{ position: 'absolute', left: 0, right: 0, top: y, borderTop: '2px dashed rgba(255,255,255,0.28)' }}>
        {(i === 0 ? [['NGN', 330], ['GBP', 1420]] : i === 1 ? [['USD', 720], ['KES', 1900]] : [['GHS', 520], ['EUR', 1240]]).map(([c, x]) => (
          <span key={c as string} style={{ position: 'absolute', left: x as number, top: -18, padding: '4px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.14)', border: '1.5px solid rgba(255,255,255,0.55)', fontFamily: fonts.mono, fontSize: 20, color: '#fff', transform: 'skewY(9deg)' }}>
            {c}
          </span>
        ))}
      </div>
    ))}
  </div>
);

const Receipt: React.FC = () => {
  const edge = (top: boolean) => Array.from({ length: 31 }, (_, i) => `${(i / 30) * 100}% ${top ? `${i % 2 ? 0 : 10}px` : `calc(100% - ${i % 2 ? 0 : 10}px)`}`);
  const Row: React.FC<{ k: string; v: string; bold?: boolean }> = ({ k, v, bold }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '7px 0', fontSize: 20, color: bold ? brand.ink : '#4a4b58' }}>
      <span>{k}</span>
      <span style={{ fontWeight: bold ? 600 : 400 }}>{v}</span>
    </div>
  );
  return (
    <div style={{ position: 'absolute', left: 1150, top: 170, width: 520, transform: 'rotate(2deg)', filter: 'drop-shadow(0 40px 60px rgba(28,28,35,0.20)) drop-shadow(0 6px 12px rgba(28,28,35,0.08))' }}>
      <div style={{ background: '#fff', padding: '46px 40px 52px', fontFamily: fonts.mono, clipPath: `polygon(${edge(true).join(', ')}, ${edge(false).reverse().join(', ')})` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 30, height: 30, borderRadius: 7, background: brand.ink, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4, padding: '0 7px' }}>
            <div style={{ height: 4, width: 12, borderRadius: 2, background: '#a3a3a3' }} />
            <div style={{ height: 4, width: 15, borderRadius: 2, background: '#a3a3a3' }} />
          </div>
          <Img src={staticFile('brand/logo-black.png')} style={{ height: 16 }} />
          <span style={{ marginLeft: 'auto', fontSize: 16, color: '#8a8b96' }}>Oct 25 · 09:40</span>
        </div>
        <div style={{ marginTop: 10, fontSize: 16, color: '#8a8b96' }}>Payout po_7Hq2…4410</div>
        <div style={{ margin: '18px 0 10px', borderTop: '1.5px dashed #d9dae2' }} />
        <Row k="Amount" v="₦450,000.00" bold />
        <Row k="From" v="NGN balance" />
        <Row k="To" v="GTBank •••• 4410" />
        <Row k="Method" v="Bank transfer" />
        <div style={{ margin: '12px 0', borderTop: '1.5px dashed #d9dae2' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: 20, color: '#4a4b58' }}>Status</span>
          <span style={{ fontSize: 34, fontWeight: 600, color: brand.ink }}>Failed</span>
        </div>
        <div style={{ marginTop: 16, fontSize: 15, color: '#8a8b96' }}>✓ read via Bachs MCP · test data</div>
      </div>
      <div style={{ position: 'absolute', left: 190, top: 395, transform: 'rotate(-12deg)', padding: '10px 18px', border: `4px solid ${brand.stamp}`, borderRadius: 8, color: brand.stamp, fontFamily: fonts.mono, fontWeight: 700, fontSize: 30, letterSpacing: '0.08em', lineHeight: 1.15, textAlign: 'center', mixBlendMode: 'multiply', opacity: 0.9 }}>
        NAME
        <br />
        MISMATCH
        <div style={{ fontSize: 13, fontWeight: 500, letterSpacing: '0.06em', marginTop: 4 }}>ACCOUNT ≠ BUSINESS NAME</div>
      </div>
    </div>
  );
};

export const FrameBrandAnswer: React.FC = () => (
  <AbsoluteFill style={{ background: brand.canvas, overflow: 'hidden' }}>
    <style>{fontFaceCss}</style>
    <Guides />
    <Band />
    <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 72, borderBottom: `1px solid ${brand.line}`, display: 'flex', alignItems: 'center', padding: '0 160px', background: 'rgba(251,252,253,0.9)' }}>
      <Img src={staticFile('brand/logo-black.png')} style={{ height: 18 }} />
      <span style={{ marginLeft: 18, fontFamily: fonts.sans, fontSize: 18, color: brand.subdued }}>MCP</span>
    </div>
    <div style={{ position: 'absolute', left: 200, top: 150, width: 860, padding: '44px 48px 46px', background: '#fff', borderRadius: 16, boxShadow: '0 20px 40px rgba(28,28,35,0.08), 0 0 0 1px rgba(112,115,147,0.12)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: fonts.sans, fontSize: 20, color: brand.text }}>
        <span style={{ width: 9, height: 9, background: brand.indigo }} /> Payouts
      </div>
      <div style={{ marginTop: 18, fontFamily: fonts.sans, fontWeight: 400, fontSize: 76, lineHeight: 1.05, letterSpacing: '-0.045em', color: brand.ink }}>Why did my last payout fail?</div>
      <div style={{ marginTop: 22, fontFamily: fonts.sans, fontSize: 28, lineHeight: 1.45, color: brand.subdued }}>
        The ₦450,000.00 payout on Oct 25 failed: <span style={{ color: brand.ink }}>the name on the bank account doesn't match your business name.</span>
      </div>
      <div style={{ marginTop: 30, display: 'flex', alignItems: 'center', gap: 14, fontFamily: fonts.sans, fontSize: 18, color: brand.subdued }}>
        <span style={{ width: 40, height: 40, borderRadius: 20, background: '#f6e7e1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ width: 12, height: 12, borderRadius: 6, background: '#d97757' }} />
        </span>
        <span>
          <span style={{ color: brand.ink }}>Answered by Claude</span>
          <br />
          Bachs MCP · read-only · one step
        </span>
        <span style={{ marginLeft: 'auto', color: brand.indigo }}>Ask the next one ›</span>
      </div>
    </div>
    <Receipt />
    <Grain />
  </AbsoluteFill>
);

// ---------- the stat cover, drawn like the blog's isometric artwork ----------

const C30 = Math.cos(Math.PI / 6);
const iso = (x: number, y: number, z = 0) => [(x - y) * C30, (x + y) * 0.5 - z] as const;
const pts = (p: (readonly [number, number])[]) => p.map(([a, b]) => `${a},${b}`).join(' ');

const IsoArt: React.FC = () => {
  const stroke = 'rgba(255,255,255,0.75)';
  const face = 'rgba(255,255,255,0.13)';
  const S = 300; // slab half size
  const T = 26; // slab thickness
  const top = [iso(-S, -S, 0), iso(S, -S, 0), iso(S, S, 0), iso(-S, S, 0)];
  const side1 = [iso(S, -S, 0), iso(S, S, 0), iso(S, S, -T), iso(S, -S, -T)];
  const side2 = [iso(-S, S, 0), iso(S, S, 0), iso(S, S, -T), iso(-S, S, -T)];
  const areas = ['Payments', 'Customers', 'Payouts', 'Disputes', 'Compliance', 'Platforms', 'Developers', 'Docs', 'Search'];
  // Nine tiles standing in a ring on the slab, each facing outward.
  const tiles = areas.map((a, i) => {
    const ang = (i / areas.length) * Math.PI * 2 - Math.PI / 2;
    const r = 210;
    return { a, cx: Math.cos(ang) * r, cy: Math.sin(ang) * r, ang };
  });
  tiles.sort((p, q) => p.cx + p.cy - (q.cx + q.cy)); // back to front
  const W = 150;
  const H = 120;
  return (
    <svg width={1100} height={900} viewBox="-550 -470 1100 900" style={{ position: 'absolute', right: 40, top: 110 }}>
      <polygon points={pts(side1)} fill="rgba(255,255,255,0.06)" stroke={stroke} strokeWidth={2} />
      <polygon points={pts(side2)} fill="rgba(255,255,255,0.10)" stroke={stroke} strokeWidth={2} />
      <polygon points={pts(top)} fill="rgba(255,255,255,0.08)" stroke={stroke} strokeWidth={2} />
      {/* the conversation at the centre: an isometric speech bubble */}
      {(() => {
        const b = [iso(-70, -70, 150), iso(70, -70, 150), iso(70, 70, 150), iso(-70, 70, 150)];
        const b0 = [iso(-70, -70, 70), iso(70, -70, 70), iso(70, 70, 70), iso(-70, 70, 70)];
        return (
          <g>
            <polygon points={pts([b0[1], b0[2], b[2], b[1]])} fill="rgba(255,255,255,0.22)" stroke={stroke} strokeWidth={2} />
            <polygon points={pts([b0[3], b0[2], b[2], b[3]])} fill="rgba(255,255,255,0.30)" stroke={stroke} strokeWidth={2} />
            <polygon points={pts(b)} fill="rgba(255,255,255,0.38)" stroke="#fff" strokeWidth={2} />
            <polygon points={pts([iso(10, 70, 90), iso(40, 70, 90), iso(20, 70, 40)])} fill="rgba(255,255,255,0.30)" stroke={stroke} strokeWidth={2} />
            {[0, 1, 2].map((k) => (
              <line key={k} x1={iso(-40 + k * 40, 70, 112)[0]} y1={iso(-40 + k * 40, 70, 112)[1]} x2={iso(-40 + k * 40, 70, 112)[0] + 4} y2={iso(-40 + k * 40, 70, 112)[1] + 2} stroke="#fff" strokeWidth={10} strokeLinecap="round" />
            ))}
          </g>
        );
      })()}
      {tiles.map(({ a, cx, cy, ang }) => {
        // A vertical tile, tangent to the ring.
        const dx = -Math.sin(ang) * (W / 2);
        const dy = Math.cos(ang) * (W / 2);
        const p = [iso(cx - dx, cy - dy, 0), iso(cx + dx, cy + dy, 0), iso(cx + dx, cy + dy, H), iso(cx - dx, cy - dy, H)];
        const [mx, my] = iso(cx, cy, H / 2);
        const [ax, ay] = iso(cx + dx, cy + dy, 0);
        const [bx, by] = iso(cx - dx, cy - dy, 0);
        const rot = (Math.atan2(ay - by, ax - bx) * 180) / Math.PI;
        const flip = rot > 90 || rot < -90;
        return (
          <g key={a}>
            <polygon points={pts(p)} fill={face} stroke={stroke} strokeWidth={2} />
            <text x={mx} y={my} fill="#fff" fontFamily="Geist, sans-serif" fontSize={22} textAnchor="middle" dominantBaseline="middle" transform={`rotate(${Math.max(-40, Math.min(40, flip ? rot + 180 : rot))} ${mx} ${my})`} opacity={0.92}>
              {a}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

export const FrameBrandCover: React.FC = () => (
  <AbsoluteFill style={{ background: brand.cobalt, overflow: 'hidden' }}>
    <style>{fontFaceCss}</style>
    <AbsoluteFill style={{ background: 'radial-gradient(70% 70% at 70% 45%, rgba(255,255,255,0.10), rgba(255,255,255,0) 70%)' }} />
    <Guides color="rgba(255,255,255,0.10)" />
    <IsoArt />
    <div style={{ position: 'absolute', left: 160, top: 96, display: 'flex', alignItems: 'center', gap: 16 }}>
      <Img src={staticFile('brand/logo-white.png')} style={{ height: 20 }} />
      <span style={{ fontFamily: fonts.sans, fontSize: 20, color: 'rgba(255,255,255,0.75)' }}>MCP</span>
    </div>
    <div style={{ position: 'absolute', left: 150, top: 250, fontFamily: fonts.sans, fontWeight: 300, fontSize: 420, lineHeight: 0.9, letterSpacing: '-0.07em', color: '#fff' }}>53</div>
    <div style={{ position: 'absolute', left: 168, top: 650, width: 640, fontFamily: fonts.sans, fontWeight: 400, fontSize: 46, lineHeight: 1.18, letterSpacing: '-0.03em', color: '#fff' }}>
      kinds of record, in nine areas. <span style={{ color: 'rgba(255,255,255,0.62)' }}>Ask about any of them, in plain words.</span>
    </div>
    <div style={{ position: 'absolute', left: 168, top: 920, fontFamily: fonts.mono, fontSize: 18, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.7)' }}>Claude answered all 20 test questions correctly</div>
    <Grain />
  </AbsoluteFill>
);
