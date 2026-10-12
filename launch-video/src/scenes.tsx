import React from 'react';
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Browser, Caption, CaptionSeq, Cursor, Stage, Words } from './components';
import { CodeBlock, introTextAt, introTyping, routeCode, syn, typeSchedule, typing, type Line } from './code';
import { clamp, ease, glide, soft } from './motion';
import { SnapKitSite } from './SnapKitSite';
import { bachs, fonts } from './theme';
import timeline from './timeline.json';

const center: React.CSSProperties = { alignItems: 'center', justifyContent: 'center' };

/* 1. Intro ------------------------------------------------------------- */
export const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const mark = soft(frame, fps, 4, 14);
  const pixel = soft(frame, fps, 30, 20);
  return (
    <AbsoluteFill style={center}>
      <Stage tone="paper" />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Img
          src={staticFile('brand/bachs-logo.svg')}
          style={{ width: 92, height: 92, transform: `scale(${mark}) rotate(${(1 - mark) * -12}deg)`, opacity: Math.min(1, mark * 1.5) }}
        />
        <div style={{ marginTop: 36, fontFamily: fonts.mono, fontSize: 22, letterSpacing: '0.3em', color: bachs.muted, opacity: ease(frame, [10, 26], [0, 1]) }}>
          INTRODUCING
        </div>
        <Words
          text="The Bachs SDK"
          delay={14}
          stagger={4}
          style={{ marginTop: 18, fontFamily: fonts.sans, fontWeight: 600, fontSize: 132, letterSpacing: '-0.045em', color: bachs.ink }}
        />
        <div
          style={{
            marginTop: 10,
            height: 80,
            alignSelf: 'stretch',
            position: 'relative',
            opacity: interpolate(pixel, [0, 0.7], [0, 1], clamp),
            filter: `blur(${(1 - Math.min(pixel, 1)) * 8}px)`,
            transform: `translateY(${(1 - pixel) * 20}px)`,
          }}
        >
          <Tagline />
        </div>
      </div>
    </AbsoluteFill>
  );
};

// "for TypeScript" → erase → "for Python" → … → "for you".
const intro = introTyping();
const CW = 0.58; // em per character; each glyph sits in a fixed cell
const Tagline: React.FC = () => {
  const frame = useCurrentFrame();
  const text = introTextAt(frame, intro.events);
  const full = 'for ' + text;
  // Re-centre smoothly as the line grows and shrinks, instead of jumping per key.
  let acc = 0;
  let wsum = 0;
  for (let k = 0; k < 12; k++) {
    const w = Math.pow(0.78, k);
    acc += w * (4 + introTextAt(frame - k, intro.events).length + 1);
    wsum += w;
  }
  const len = acc / wsum;
  const done = frame >= intro.end;
  const lastKey = [...intro.events].reverse().find((e) => frame >= e.f)?.f ?? 0;
  const typing = frame - lastKey < 8;
  const caretOn = typing || Math.floor(frame / 14) % 2 === 0;
  const caretFade = done ? ease(frame, [intro.end + 14, intro.end + 24], [1, 0]) : 1;
  const isYou = text === 'you' && done;
  const youPop = isYou ? soft(frame, 30, intro.events[intro.events.length - 1].f, 12) : 0;
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: 0,
        display: 'flex',
        alignItems: 'center',
        fontFamily: fonts.pixel,
        fontSize: 64,
        lineHeight: '80px',
        whiteSpace: 'pre',
        transform: `translateX(${(-len * CW * 64) / 2}px)`,
      }}
    >
      {full.split('').map((ch, i) => (
        <span
          key={i}
          style={{
            display: 'inline-block',
            width: `${CW}em`,
            textAlign: 'center',
            color: i < 4 ? bachs.muted : isYou ? bachs.ink : bachs.indigo,
            transform: i >= 4 && isYou ? `translateY(${-Math.sin(Math.min(youPop, 1) * Math.PI) * 6}px)` : undefined,
          }}
        >
          {ch}
        </span>
      ))}
      <span
        style={{
          display: 'inline-block',
          width: 6,
          height: 62,
          marginLeft: 4,
          background: bachs.indigo,
          opacity: (caretOn ? 1 : 0) * caretFade,
        }}
      />
    </div>
  );
};

/* 2. Meet SnapKit ------------------------------------------------------ */
export const MeetSnapKit: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rise = glide(frame, fps, 6, 46);
  const scroll = ease(frame, [110, 185], [0, 210], (t) => t * t * (3 - 2 * t));
  const pulse = interpolate(frame % 50, [0, 6, 30], [0, 1, 0], clamp);
  return (
    <AbsoluteFill>
      <Stage tone="sky" />
      <Caption text="Meet SnapKit. A screenshot API that needs to get paid." delay={10} dark highlight={['SnapKit']} />
      <AbsoluteFill style={{ ...center, paddingTop: 120 }}>
        <div style={{ transform: `translateY(${(1 - rise) * 700}px) rotateX(${(1 - rise) * 18}deg) scale(${0.94 + rise * 0.06 + frame * 0.0002})`, transformOrigin: '50% 100%' }}>
          <Browser url="snapkit.bachs.io" title="SnapKit — Screenshot API" width={1560} height={850}>
            <div style={{ position: 'absolute', inset: 0, transform: 'scale(1.0)', transformOrigin: 'top left' }}>
              <SnapKitSite scroll={scroll} requestPulse={pulse} />
            </div>
          </Browser>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* 3. Install ----------------------------------------------------------- */
const installLine: Line[] = [[['npm install @bachs/sdk', '#f4f4f6']]];
export const Install: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = soft(frame, fps, 2, 15);
  const { times, end } = typeSchedule(installLine, typing.npm.start, typing.npm.cps, typing.npm.seed);
  const out1 = soft(frame, fps, end + 10, 18);
  const out2 = soft(frame, fps, end + 18, 18);
  return (
    <AbsoluteFill style={center}>
      <Stage tone="night" />
      <Caption text="One package. Zero dependencies." delay={end + 14} dark top={150} highlight={['Zero']} />
      <div
        style={{
          width: 1100,
          borderRadius: 18,
          background: 'rgba(22,23,34,0.92)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 50px 120px rgba(0,0,0,0.5), 0 0 120px rgba(82,102,235,0.18)',
          transform: `scale(${0.9 + pop * 0.1}) translateY(${(1 - pop) * 60 + 40}px)`,
          opacity: Math.min(1, pop * 1.4),
          overflow: 'hidden',
        }}
      >
        <div style={{ height: 46, display: 'flex', alignItems: 'center', gap: 9, padding: '0 18px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
            <div key={c} style={{ width: 13, height: 13, borderRadius: 7, background: c }} />
          ))}
          <div style={{ flex: 1, textAlign: 'center', fontFamily: fonts.mono, color: '#7c7f99', fontSize: 16, marginRight: 60 }}>~/snapkit</div>
        </div>
        <div style={{ padding: '34px 40px 40px', fontFamily: fonts.mono, fontSize: 36 }}>
          <div style={{ display: 'flex' }}>
            <span style={{ color: bachs.indigoSoft, marginRight: 22 }}>❯</span>
            <CodeBlock lines={installLine} frame={frame} times={times} fontSize={36} lineNumbers={false} showCaret={frame < end + 6} />
          </div>
          <div style={{ marginTop: 18, fontSize: 26, color: '#8c8fae', opacity: out1, transform: `translateY(${(1 - out1) * 12}px)` }}>
            added 1 package in 0.8s
          </div>
          <div style={{ marginTop: 8, fontSize: 26, color: syn.str, opacity: out2, transform: `translateY(${(1 - out2) * 12}px)` }}>
            ✓ @bachs/sdk@1.0.0 · 0 runtime dependencies
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* 4. Code -------------------------------------------------------------- */
export const Code: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { times, end } = typeSchedule(routeCode, typing.route.start, typing.route.cps, typing.route.seed);
  const win = glide(frame, fps, 0, 36);
  const dimT = ease(frame, [end + 8, end + 26], [0, 1]);
  // The camera follows the caret down the file, then pulls back to frame the whole route.
  const follow = interpolate(frame, [26, end], [0, 1], clamp);
  const zoom = interpolate(frame, [0, end, end + 30], [1.12, 1.06, 1.0], { ...clamp, easing: (t) => 1 - Math.pow(1 - t, 3) });
  const camY = interpolate(follow, [0, 1], [150, -40]) * (1 - dimT);
  return (
    <AbsoluteFill style={center}>
      <Stage tone="night" />
      <CaptionSeq
        dark
        items={[
          { from: 0, to: end + 6, text: 'A checkout endpoint, in one file.' },
          { from: end + 6, to: 400, text: 'Bachs hands you a URL. Send your customer there.', highlight: ['URL.'] },
        ]}
      />
      <div
        style={{
          marginTop: 110,
          width: 1480,
          borderRadius: 20,
          background: syn.bg,
          border: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '0 60px 140px rgba(0,0,0,0.55), 0 0 160px rgba(82,102,235,0.16)',
          transform: `translateY(${(1 - win) * 120 + camY}px) scale(${zoom})`,
          opacity: win,
          overflow: 'hidden',
        }}
      >
        <div style={{ height: 52, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 9, background: '#10111a' }}>
          {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
            <div key={c} style={{ width: 13, height: 13, borderRadius: 7, background: c }} />
          ))}
          <div
            style={{
              marginLeft: 26,
              height: 52,
              display: 'flex',
              alignItems: 'center',
              padding: '0 20px',
              background: syn.bg,
              color: '#d6d8ea',
              fontFamily: fonts.mono,
              fontSize: 17,
              borderTop: `2px solid ${bachs.indigoSoft}`,
            }}
          >
            app/api/checkout/route.ts
          </div>
        </div>
        <div style={{ padding: '26px 30px 34px' }}>
          <CodeBlock lines={routeCode} frame={frame} times={times} fontSize={29} focus={[8, 9, 10, 11, 13]} dimT={dimT} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* 5. Checkout ---------------------------------------------------------- */
const beats = timeline.checkout;
export const Checkout: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = glide(frame, fps, 0, 30);
  const qty = 1 + beats.plus.filter((f) => frame >= f).length;
  const lastPlus = [...beats.plus].reverse().find((f) => frame >= f) ?? -99;
  const bump = interpolate(frame - lastPlus, [0, 3, 10], [0, 1, 0], clamp);
  const pressPlus = beats.plus.reduce((m, f) => Math.max(m, interpolate(frame, [f, f + 2, f + 7], [0, 1, 0], clamp)), 0);
  const pressBuy = interpolate(frame, [beats.buy, beats.buy + 3, beats.buy + 10], [0, 1, 0], clamp);
  const modal = soft(frame, fps, beats.modal, 15);
  const scrim = ease(frame, [beats.modal - 4, beats.modal + 12], [0, 0.55]);
  const pay = beats.pay;
  const paid = soft(frame, fps, pay + 6, 14);
  const ring = ease(frame, [pay + 10, pay + 32], [0, 1]);
  const tick = ease(frame, [pay + 24, pay + 40], [0, 1]);
  // Ease into the pack, then a slow push toward the checkout once it opens.
  const scroll = ease(frame, [0, 36], [1180, 1290]);
  const push = ease(frame, [beats.modal, 250], [1, 1.06], (t) => t * t * (3 - 2 * t));
  const sc = (0.96 + enter * 0.04) * push;
  const pressPay = interpolate(frame, [pay, pay + 3, pay + 10], [0, 1, 0], clamp);
  return (
    <AbsoluteFill>
      <Stage tone="sky" />
      <CaptionSeq
        dark
        items={[
          { from: 0, to: beats.modal, text: 'Pick a pack. Seven, why not.' },
          { from: beats.modal, to: pay + 4, text: 'Your customers pay in their own currency.', highlight: ['own', 'currency.'] },
          { from: pay + 4, to: 300, text: 'Paid. Bachs handles the rest.' },
        ]}
      />
      <AbsoluteFill style={{ ...center, paddingTop: 120 }}>
        <div style={{ position: 'relative', transform: `scale(${sc})` }}>
          <Browser url="snapkit.bachs.io" title="SnapKit — Screenshot API" width={1560} height={850}>
            <SnapKitSite scroll={scroll} qty={qty} bump={bump} pressPlus={pressPlus} pressBuy={pressBuy} />
            <AbsoluteFill style={{ background: `rgba(20,20,24,${scrim})` }} />
            <AbsoluteFill style={center}>
              <div
                style={{
                  position: 'relative',
                  width: 1092,
                  height: 760,
                  borderRadius: 20,
                  overflow: 'hidden',
                  boxShadow: '0 40px 100px rgba(0,0,0,0.4)',
                  opacity: Math.min(1, modal * 1.6),
                  transform: `translateY(${(1 - modal) * 70}px) scale(${0.92 + modal * 0.08})`,
                }}
              >
                <Img src={staticFile('shots/checkout-modal.png')} style={{ width: '100%', height: '100%' }} />
                {/* The Pay now button, so it can react to the click. */}
                <div
                  style={{
                    position: 'absolute',
                    left: 674,
                    top: 357,
                    width: 341,
                    height: 39,
                    borderRadius: 20,
                    background: '#5b5fe8',
                    color: '#fff',
                    fontFamily: fonts.sans,
                    fontWeight: 500,
                    fontSize: 15,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: pressPay > 0 ? 1 : 0,
                    transform: `scale(${1 - pressPay * 0.04})`,
                    filter: `brightness(${1 - pressPay * 0.12})`,
                  }}
                >
                  Pay now
                </div>
                {/* Success state, drawn in the Bachs checkout's own style. */}
                <div
                  style={{
                    position: 'absolute',
                    top: 42,
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: '#fff',
                    opacity: interpolate(paid, [0, 0.5], [0, 1], clamp),
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg width="124" height="124" viewBox="0 0 124 124" style={{ transform: `scale(${0.7 + paid * 0.3})` }}>
                    <circle cx="62" cy="62" r="54" fill="none" stroke="#5b5fe8" strokeWidth="7" strokeDasharray={340} strokeDashoffset={340 * (1 - ring)} transform="rotate(-90 62 62)" strokeLinecap="round" />
                    <path d="M40 64 L56 80 L86 46" fill="none" stroke="#5b5fe8" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={80} strokeDashoffset={80 * (1 - tick)} />
                  </svg>
                  <div style={{ fontFamily: fonts.sans, fontSize: 38, fontWeight: 600, color: '#1d1d2c', marginTop: 30, opacity: ease(frame, [pay + 24, pay + 38], [0, 1]) }}>
                    Payment successful
                  </div>
                  <div style={{ fontFamily: fonts.sans, fontSize: 22, color: '#6b6d85', marginTop: 12, opacity: ease(frame, [pay + 30, pay + 44], [0, 1]) }}>
                    SnapKit Credit Pack · 7 × $10.00 · paid in NGN
                  </div>
                  <div style={{ fontFamily: fonts.mono, fontSize: 16, color: '#9a9cb3', marginTop: 26, opacity: ease(frame, [pay + 40, pay + 54], [0, 1]) }}>
                    Returning you to SnapKit…
                  </div>
                </div>
              </div>
            </AbsoluteFill>
          </Browser>
          <Cursor
            appear={6}
            keys={[
              { f: 0, x: 1180, y: 860 },
              { f: beats.plus[0] - 4, x: PLUS.x, y: PLUS.y },
              ...beats.plus.map((f) => ({ f, x: PLUS.x, y: PLUS.y, click: true })),
              { f: beats.buy - 4, x: BUY.x, y: BUY.y },
              { f: beats.buy, x: BUY.x, y: BUY.y, click: true },
              { f: beats.modal + 30, x: BUY.x - 40, y: BUY.y + 40 },
              { f: pay - 6, x: PAY.x, y: PAY.y },
              { f: pay, x: PAY.x, y: PAY.y, click: true },
              { f: 280, x: PAY.x + 120, y: PAY.y + 160 },
            ]}
          />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// Cursor targets in browser-window coordinates (chrome is 94px tall).
const PLUS = { x: 726, y: 562 };
const BUY = { x: 852, y: 562 };
const PAY = { x: 1077, y: 467 };

/* 6. Dashboard --------------------------------------------------------- */
const Shot: React.FC<{ src: string; w: number; h: number; style?: React.CSSProperties; radius?: number }> = ({ src, w, h, style, radius = 16 }) => (
  <div
    style={{
      position: 'absolute',
      width: w,
      height: h,
      borderRadius: radius,
      overflow: 'hidden',
      background: '#fff',
      boxShadow: '0 40px 100px rgba(10,20,40,0.32), 0 6px 20px rgba(10,20,40,0.14), 0 0 0 1px rgba(17,17,17,0.06)',
      ...style,
    }}
  >
    <Img src={staticFile(src)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top left' }} />
  </div>
);

export const Dashboard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = glide(frame, fps, 0, 40);
  const b = soft(frame, fps, 80, 17);
  const c = soft(frame, fps, 160, 17);
  const d = soft(frame, fps, 222, 13);
  const rowSweep = ease(frame, [110, 150], [0, 1]);
  const drift = frame * 0.06;
  const captions = [
    { from: 0, to: 80, text: 'Every payment lands in your dashboard.' },
    { from: 80, to: 160, text: 'Know the moment money moves.' },
    { from: 160, to: 222, text: 'Webhooks, delivered and verified.' },
    { from: 222, to: 330, text: 'Then pay yourself out, in your currency.' },
  ];
  return (
    <AbsoluteFill>
      <Stage tone="sky" />
      {captions.map((cap) => {
        const o = ease(frame, [cap.from, cap.from + 10], [0, 1]) * (1 - ease(frame, [cap.to - 4, cap.to + 6], [0, 1]));
        return o > 0 ? (
          <div key={cap.text} style={{ position: 'absolute', inset: 0, zIndex: 2, opacity: o }}>
            <Caption text={cap.text} delay={cap.from + 4} dark />
          </div>
        ) : null;
      })}
      <AbsoluteFill style={{ perspective: 2400 }}>
        <Shot
          src="shots/dashboard.png"
          w={1336}
          h={731}
          style={{
            left: 292 - drift,
            top: 230 + (1 - a) * 500,
            transform: `rotateY(${8 - a * 4}deg) rotateX(${(1 - a) * 20}deg) scale(${1 - b * 0.06})`,
            opacity: a * (1 - b * 0.25),
            filter: `blur(${b * 1.5}px)`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 400 + drift * 0.5,
            top: 268 + (1 - b) * 520,
            opacity: Math.min(1, b * 1.4) * (1 - c * 0.25),
            transform: `rotateY(${-4 + b * 2}deg) scale(${1 - c * 0.05})`,
            filter: `blur(${c * 1.5}px)`,
          }}
        >
          <Shot src="shots/transactions.png" w={1210} h={671} style={{ position: 'relative' }} />
          {/* Highlight the newest successful payment row. */}
          <div
            style={{
              position: 'absolute',
              left: 245 * 0.8 - 8,
              top: 356 * 0.8 - 19,
              height: 38,
              width: ((1475 - 245) * 0.8 + 16) * rowSweep,
              background: 'rgba(82,102,235,0.12)',
              border: `2px solid rgba(82,102,235,${0.8 * rowSweep})`,
              borderRadius: 8,
            }}
          />
        </div>
        <Shot
          src="shots/developer-portal-events.png"
          w={1210}
          h={669}
          style={{
            left: 500 + drift * 0.3,
            top: 300 + (1 - c) * 520,
            opacity: Math.min(1, c * 1.4),
            transform: `rotateY(${-6 + c * 3}deg) scale(${1 - d * 0.04})`,
            filter: `blur(${d * 2}px)`,
          }}
        />
        <Shot
          src="shots/withdrawal-modal.png"
          w={720}
          h={432}
          radius={26}
          style={{
            left: 600,
            top: 420 + (1 - d) * 80,
            opacity: Math.min(1, d * 1.5),
            transform: `scale(${0.85 + d * 0.15})`,
          }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* 7. Languages --------------------------------------------------------- */
export const Languages: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const card = glide(frame, fps, 0, 34);
  const tabs = [
    { name: 'TypeScript', status: 'Available now', live: true },
    { name: 'Python', status: 'Coming soon', live: false },
    { name: 'Go', status: 'Coming soon', live: false },
  ];
  return (
    <AbsoluteFill style={center}>
      <Stage tone="paper" />
      <Caption text="TypeScript today. Python and Go are next." delay={8} highlight={['Python', 'Go']} top={150} />
      <div style={{ display: 'flex', gap: 28, marginTop: 110, opacity: card, transform: `translateY(${(1 - card) * 80}px)` }}>
        {tabs.map((t, i) => {
          const s = soft(frame, fps, 18 + i * 9, 15);
          const live = t.live;
          return (
            <div
              key={t.name}
              style={{
                width: 420,
                height: 300,
                borderRadius: 24,
                background: live ? bachs.ink : '#fff',
                border: live ? 'none' : `1.5px dashed rgba(17,17,17,0.18)`,
                boxShadow: live ? '0 40px 90px rgba(17,17,17,0.25)' : 'none',
                padding: 38,
                display: 'flex',
                flexDirection: 'column',
                transform: `translateY(${(1 - s) * 60}px) scale(${0.9 + s * 0.1})`,
                opacity: Math.min(1, s * 1.5),
              }}
            >
              <div style={{ fontFamily: fonts.mono, fontSize: 18, letterSpacing: '0.14em', color: live ? '#a7b2ff' : bachs.muted }}>{t.status.toUpperCase()}</div>
              <div style={{ fontFamily: fonts.sans, fontWeight: 600, fontSize: 64, letterSpacing: '-0.035em', color: live ? '#fff' : bachs.ink, marginTop: 'auto' }}>
                {t.name}
              </div>
              <div
                style={{
                  marginTop: 18,
                  fontFamily: fonts.mono,
                  fontSize: 21,
                  color: live ? syn.str : 'rgba(17,17,17,0.35)',
                  filter: live ? 'none' : 'blur(5px)',
                }}
              >
                {live ? 'npm install @bachs/sdk' : t.name === 'Python' ? 'pip install bachs' : 'go get bachs.io/sdk'}
              </div>
              {live && (
                <div
                  style={{
                    position: 'absolute',
                    width: 14,
                    height: 14,
                    borderRadius: 7,
                    background: '#54d38a',
                    marginLeft: 330,
                    marginTop: 4,
                    boxShadow: `0 0 0 ${6 + Math.sin(frame / 7) * 4}px rgba(84,211,138,0.2)`,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/* 8. Outro ------------------------------------------------------------- */
export const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logo = soft(frame, fps, 6, 18);
  const pill = soft(frame, fps, 30, 15);
  const copied = frame > 78;
  const copyPop = soft(frame, fps, 78, 12);
  return (
    <AbsoluteFill style={center}>
      <Stage tone="paper" />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Img
          src={staticFile('brand/lettermark.svg')}
          style={{ width: 520, opacity: Math.min(1, logo * 1.4), filter: `blur(${(1 - Math.min(logo, 1)) * 12}px)`, transform: `scale(${0.92 + logo * 0.08})` }}
        />
        <div
          style={{
            marginTop: 64,
            display: 'flex',
            alignItems: 'center',
            gap: 22,
            padding: '20px 22px 20px 34px',
            borderRadius: 18,
            background: bachs.ink,
            boxShadow: '0 30px 70px rgba(17,17,17,0.22)',
            opacity: Math.min(1, pill * 1.4),
            transform: `translateY(${(1 - pill) * 30}px)`,
          }}
        >
          <span style={{ fontFamily: fonts.mono, fontSize: 34, color: '#f4f4f6' }}>
            <span style={{ color: '#7c86f0' }}>$</span> npm install @bachs/sdk
          </span>
          <div
            style={{
              fontFamily: fonts.sans,
              fontWeight: 600,
              fontSize: 20,
              padding: '10px 18px',
              borderRadius: 10,
              background: copied ? '#54d38a' : 'rgba(255,255,255,0.1)',
              color: copied ? '#0b2a17' : '#d6d8ea',
              transform: `scale(${copied ? 0.94 + copyPop * 0.06 : 1})`,
              minWidth: 92,
              textAlign: 'center',
            }}
          >
            {copied ? 'Copied' : 'Copy'}
          </div>
        </div>
        <div style={{ marginTop: 36, fontFamily: fonts.sans, fontSize: 30, color: bachs.muted, opacity: ease(frame, [50, 66], [0, 1]) }}>
          Docs at <span style={{ color: bachs.indigo, fontWeight: 600 }}>docs.bachs.io</span> · Try the demo at{' '}
          <span style={{ color: bachs.ink, fontWeight: 600 }}>snapkit.bachs.io</span>
        </div>
      </div>
      <Cursor
        appear={40}
        keys={[
          { f: 40, x: 1400, y: 900 },
          { f: 72, x: 1290, y: 628 },
          { f: 76, x: 1290, y: 628, click: true },
          { f: 140, x: 1360, y: 760 },
        ]}
      />
    </AbsoluteFill>
  );
};
