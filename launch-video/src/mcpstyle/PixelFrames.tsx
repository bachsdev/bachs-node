import React from 'react';
import { AbsoluteFill, Img, random, staticFile } from 'remotion';
import { fontFaceCss, fonts } from '../theme';

// The Bachs MCP campaign language (from the optimisation cards): Geist Pixel
// for the big figures, Geist for statements, Geist Mono only for real data;
// the square as the unit; data as texture; cobalt, navy with scanlines, and
// light grid paper. The idea: your account is a sea of records, and a
// question pulls out just the ones that answer it.

export const px = {
  cobalt: '#3672ea',
  cobaltLift: '#5089f0',
  navy: '#12142a',
  paper: '#f6f7fb',
  ink: '#1c1d2b',
  sky: '#a9c6ff',
  grey: '#a2a8bc',
  muted: '#646a80',
  white: '#ffffff',
  green: '#6fdc8c',
  red: '#ff6b5e',
};

const Header: React.FC<{ dark?: boolean }> = ({ dark }) => (
  <>
    <Img src={staticFile(dark ? 'brand/logo-white.png' : 'brand/logo-black.png')} style={{ position: 'absolute', left: 120, top: 92, height: 40 }} />
    <div style={{ position: 'absolute', right: 120, top: 92, fontFamily: fonts.sans, fontSize: 34, color: dark ? 'rgba(255,255,255,0.7)' : px.muted }}>Bachs MCP</div>
  </>
);

// ---------- A. the search: one record out of the wall ----------

const NAMES = ['Kwame Obi', 'Amina Addo', 'Kwame Ajayi', 'Femi Mensah', 'Nneka Ibrahim', 'Tunde Bello', 'Zainab Okoro', 'Kofi Asante', 'Chidi Eze', 'Halima Musa', 'Yaw Boateng', 'Ngozi Adeyemi'];
const record = (i: number) => {
  const n = NAMES[Math.floor(random(`n${i}`) * NAMES.length)];
  const amt = (Math.round(random(`a${i}`) * 80) * 500 + 2500).toFixed(2);
  const id = Math.floor(random(`i${i}`) * 0xfffffffff).toString(16).padStart(9, '0');
  return `{ "id": "chrg_${id}", "reference": "order_${1000 + Math.floor(random(`r${i}`) * 9000)}", "status": "${random(`s${i}`) > 0.2 ? 'succeeded' : 'pending'}", "amount": "${amt}", "customer_name": "${n}", "currency": "NGN", "transaction_date": "2026-10-${String(1 + Math.floor(random(`d${i}`) * 26)).padStart(2, '0')}" }`;
};

export const FrameSearch: React.FC = () => {
  const LINE = 34;
  const lines = Array.from({ length: 32 }, (_, i) => record(i));
  const hit = 17;
  lines[hit] = '{ "id": "chrg_7c41e0a9d2", "reference": "order_4821", "status": "succeeded", "amount": "25000.00", "customer_name": "Ada Obi", "currency": "NGN", "transaction_date": "2026-10-21" }';
  return (
    <AbsoluteFill style={{ background: px.paper, overflow: 'hidden' }}>
      <style>{fontFaceCss}</style>
      {/* the account, as the agent would have had to read it */}
      <div style={{ position: 'absolute', left: -40, top: 20, fontFamily: fonts.mono, fontSize: 22, lineHeight: `${LINE}px`, whiteSpace: 'nowrap', color: 'rgba(28,29,43,0.11)' }}>
        {lines.map((l, i) => (
          <div key={i} style={{ color: i === hit ? px.cobalt : undefined, background: i === hit ? 'rgba(54,114,234,0.10)' : undefined, transform: `translateX(${-(i * 137) % 600}px)` }}>
            {l} {l}
          </div>
        ))}
      </div>
      <Header />
      <div style={{ position: 'absolute', left: 120, top: 250, width: 1680, fontFamily: fonts.sans, fontWeight: 500, fontSize: 112, lineHeight: 1.02, letterSpacing: '-0.035em', color: px.ink }}>
        “Find Ada Obi's payment.”
      </div>
      <div style={{ position: 'absolute', left: 120, top: 400, width: 1680, fontFamily: fonts.sans, fontWeight: 400, fontSize: 56, lineHeight: 1.15, letterSpacing: '-0.02em', color: px.ink }}>
        Out of 300 payments, one search brings back hers.
      </div>
      <div style={{ position: 'absolute', left: 120, right: 120, top: 600, padding: '44px 56px', borderRadius: 26, background: px.navy, boxShadow: '0 0 0 14px rgba(54,114,234,0.14), 0 30px 80px rgba(54,114,234,0.25)', fontFamily: fonts.mono, fontSize: 32, lineHeight: 1.55, color: px.white }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.65)' }}>
          <span>search("Ada Obi")</span>
          <span style={{ color: px.sky }}>■ 1 call</span>
        </div>
        <div style={{ marginTop: 22 }}>
          {'{'}"customer_name": <span style={{ color: px.sky }}>"Ada Obi"</span>, "status": <span style={{ color: px.green }}>"succeeded"</span>,
          <br />
          &nbsp;"amount": <span style={{ color: px.sky }}>"25000.00"</span>, "currency": <span style={{ color: px.sky }}>"NGN"</span>, "reference": <span style={{ color: px.sky }}>"order_4821"</span>{'}'}
        </div>
      </div>
      <div style={{ position: 'absolute', left: 120, top: 960, fontFamily: fonts.sans, fontSize: 30, color: px.muted }}>Sandbox account of 300 payments. Ada Obi is not a real customer.</div>
    </AbsoluteFill>
  );
};

// ---------- B. money, in pixels and squares ----------

export const FrameMoney: React.FC = () => {
  const COLS = 40;
  const ROWS = 8;
  const available = 128; // ₦1,284,500 at ₦10,000 a square
  const settling = 31; // ₦312,000 settles tomorrow
  const S = 30;
  const G = 9;
  return (
    <AbsoluteFill style={{ background: px.cobalt, overflow: 'hidden' }}>
      <style>{fontFaceCss}</style>
      <Header dark />
      <div style={{ position: 'absolute', left: 112, top: 230, display: 'flex', alignItems: 'baseline', color: px.white }}>
        <span style={{ fontFamily: fonts.sans, fontWeight: 400, fontSize: 150, marginRight: 12 }}>₦</span>
        <span style={{ fontFamily: fonts.pixel, fontSize: 210, lineHeight: 1, letterSpacing: '-0.02em' }}>1,284,500</span>
      </div>
      <div style={{ position: 'absolute', left: 120, top: 470, width: 1100, fontFamily: fonts.sans, fontSize: 52, lineHeight: 1.2, letterSpacing: '-0.02em', color: px.white }}>
        available in naira, and ₦312,000 more settles tomorrow.
      </div>
      <div style={{ position: 'absolute', right: 120, top: 486, width: 520, textAlign: 'right', fontFamily: fonts.sans, fontSize: 32, lineHeight: 1.35, color: 'rgba(255,255,255,0.72)' }}>“How much money do I have, and what settles tomorrow?”</div>
      <div style={{ position: 'absolute', left: 120, top: 660, display: 'grid', gridTemplateColumns: `repeat(${COLS}, ${S}px)`, gap: G }}>
        {Array.from({ length: COLS * ROWS }, (_, i) => {
          // fill column by column from the left, like money arriving
          const col = Math.floor(i % COLS);
          const row = Math.floor(i / COLS);
          const order = col * ROWS + row;
          const on = order < available;
          const next = !on && order < available + settling;
          return (
            <div
              key={i}
              style={{
                width: S,
                height: S,
                background: on ? px.white : next ? 'transparent' : px.cobaltLift,
                border: next ? `3px solid ${px.white}` : undefined,
                boxSizing: 'border-box',
                boxShadow: on ? '0 0 14px rgba(255,255,255,0.45)' : undefined,
              }}
            />
          );
        })}
      </div>
      <div style={{ position: 'absolute', left: 120, right: 120, top: 1000, display: 'flex', justifyContent: 'space-between', fontFamily: fonts.sans, fontSize: 30, color: 'rgba(255,255,255,0.8)' }}>
        <span>Each square is ₦10,000.</span>
        <span>
          Available <b style={{ color: px.white, fontWeight: 600 }}>■ 128</b> · Settles tomorrow <b style={{ color: px.white, fontWeight: 600 }}>□ 31</b> · test data
        </span>
      </div>
    </AbsoluteFill>
  );
};

// ---------- C. the terminal: navy, scanlines, a plain answer ----------

export const FrameTerminal: React.FC = () => (
  <AbsoluteFill style={{ background: px.navy, overflow: 'hidden' }}>
    <style>{fontFaceCss}</style>
    <AbsoluteFill style={{ backgroundImage: 'repeating-linear-gradient(to bottom, rgba(255,255,255,0.035) 0 2px, transparent 2px 5px)' }} />
    <AbsoluteFill style={{ background: 'radial-gradient(60% 50% at 30% 35%, rgba(54,114,234,0.22), rgba(54,114,234,0) 70%)' }} />
    <Header dark />
    <div style={{ position: 'absolute', left: 120, top: 230, fontFamily: fonts.mono, fontSize: 40, color: px.sky }}>
      <span style={{ color: 'rgba(169,198,255,0.6)' }}>$ </span>why did my last payout fail?
    </div>
    <div style={{ position: 'absolute', left: 112, top: 330, fontFamily: fonts.pixel, fontSize: 250, lineHeight: 1, color: px.sky, textShadow: '0 0 28px rgba(120,160,255,0.65)' }}>PO-20263</div>
    <div style={{ position: 'absolute', left: 120, top: 640, width: 1300, fontFamily: fonts.sans, fontSize: 64, lineHeight: 1.12, letterSpacing: '-0.025em', color: px.white }}>
      The name on the bank account doesn't match your business name.
    </div>
    <div style={{ position: 'absolute', left: 120, right: 120, top: 900, display: 'flex', justifyContent: 'space-between', fontFamily: fonts.mono, fontSize: 30, color: 'rgba(255,255,255,0.7)' }}>
      <span>₦450,000.00 · GTBank •••• 4410 · Oct 25</span>
      <span>
        <span style={{ color: px.green }}>✓</span> answered in 1 call <span style={{ color: px.cobaltLift }}>■</span>
      </span>
    </div>
  </AbsoluteFill>
);
