import React from 'react';
import { AbsoluteFill, Audio, Easing, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { Grain } from '../components';
import { AddConnector, AllowPage, AREAS, Badge, c, Check, ConnectedApps, keyFrames, QS, Wordmark } from '../mcplaunch/McpLaunch';
import { fontFaceCss, fonts } from '../theme';
import edit from './edit.json';

// Bachs MCP launch, high-energy cut. Everything lands on the 145 BPM grid and
// the camera never stops moving, but no cut is bare: every hand-off carries
// motion through it (a zoom through the frame, a whip with motion blur, or an
// accent wipe), so it stays fast without feeling choppy.

const B = edit.beatFrames;
const b = (n: number) => Math.round(n * B);
export const MCP_HYPE_TOTAL = edit.total;

const IO = Easing.bezier(0.4, 0, 0.2, 1);
const OUT = Easing.bezier(0.05, 0.7, 0.1, 1);
const IN = Easing.bezier(0.3, 0, 1, 1);
const k = (f: number, a: number, z: number, easing = IO) => interpolate(f, [a, z], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing });

type Move = 'zoom' | 'whip' | 'none';
const IN_F = 8;
const OUT_F = 7;

// A shot: enters and exits with motion, and drifts towards the viewer while it holds.
const Shot: React.FC<{ from: number; to: number; enter?: Move; exit?: Move; children: React.ReactNode }> = ({ from, to, enter = 'zoom', exit = 'zoom', children }) => {
  const f = useCurrentFrame();
  if (f < from || f >= to + (exit === 'none' ? 0 : OUT_F)) return null;
  const i = enter === 'none' ? 1 : k(f, from, from + IN_F, OUT);
  const o = exit === 'none' ? 0 : k(f, to, to + OUT_F, IN);
  const drift = 1 + 0.04 * k(f, from, to);
  let scale = drift;
  let x = 0;
  let blur = 0;
  if (enter === 'zoom') {
    scale *= 1.35 - 0.35 * i;
    blur += (1 - i) * 14;
  }
  if (enter === 'whip') {
    x += (1 - i) * 560;
    blur += (1 - i) * 18;
  }
  if (exit === 'zoom') {
    scale *= 1 + o * 1.4;
    blur += o * 14;
  }
  if (exit === 'whip') {
    x -= o * 560;
    blur += o * 18;
  }
  return <AbsoluteFill style={{ opacity: i * (1 - o), transform: `translateX(${x}px) scale(${scale})`, filter: blur > 0.2 ? `blur(${blur}px)` : undefined }}>{children}</AbsoluteFill>;
};

// An accent panel that sweeps across the frame; the shot under it changes while it covers the middle.
const Wipe: React.FC<{ at: number }> = ({ at }) => {
  const f = useCurrentFrame();
  if (f < at - 8 || f > at + 8) return null;
  const t = k(f, at - 8, at + 8, Easing.inOut(Easing.cubic)); // symmetric, so it fully covers the frame at the cut
  return <div style={{ position: 'absolute', top: -100, bottom: -100, width: 2600, left: -2900 + t * 5000, background: c.accent, transform: 'skewX(-14deg)', boxShadow: '0 0 120px rgba(122,135,255,0.6)' }} />;
};

// A flash of light on the big hits.
const Flash: React.FC<{ at: number }> = ({ at }) => {
  const f = useCurrentFrame();
  const t = interpolate(f, [at, at + 2, at + 14], [0, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (t <= 0) return null;
  return <AbsoluteFill style={{ background: 'radial-gradient(60% 60% at 50% 50%, rgba(122,135,255,0.55), rgba(122,135,255,0) 70%)', opacity: t }} />;
};

// Big type that lands: from slightly larger and blurred into place.
const Slam: React.FC<{ at: number; size: number; color?: string; weight?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ at, size, color = c.fg, weight = 700, style, children }) => {
  const f = useCurrentFrame();
  const t = k(f, at, at + 6, OUT);
  if (f < at) return null;
  return (
    <div style={{ fontFamily: fonts.sans, fontWeight: weight, fontSize: size, letterSpacing: '-0.05em', lineHeight: 1.05, color, whiteSpace: 'nowrap', opacity: t, transform: `scale(${1.28 - 0.28 * t})`, filter: `blur(${(1 - t) * 10}px)`, ...style }}>
      {children}
    </div>
  );
};

const Ambient: React.FC = () => {
  const f = useCurrentFrame();
  const pulse = 0.08 + 0.05 * Math.pow(1 - ((f % B) / B), 3) * (f >= b(16) ? 1 : 0.4); // breathes with the kick
  return <AbsoluteFill style={{ background: `radial-gradient(60% 55% at ${50 + Math.sin(f / 60) * 12}% ${45 + Math.cos(f / 75) * 8}%, rgba(122,135,255,${pulse}), rgba(122,135,255,0) 70%), ${c.bg}` }} />;
};

// ---------- hook: feature words, faster and faster, into the drop ----------

const WORDS: [string, number][] = [
  ['payments.', 0],
  ['payouts.', 4],
  ['disputes.', 8],
  ['customers.', 10],
  ['balances.', 12],
  ['webhooks.', 13],
  ['invoices.', 14],
  ['refunds.', 15],
];

const Hook: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Shot from={0} to={b(15.5)} enter="none" exit="zoom">
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: fonts.sans, fontSize: 44, color: c.muted, marginBottom: 18, opacity: k(f, 2, 14, OUT) }}>Ask about your</div>
        <div style={{ height: 240, display: 'flex', alignItems: 'center' }}>
          {WORDS.map(([w, at], i) => {
            const next = WORDS[i + 1]?.[1] ?? 99;
            if (f < b(at) || f >= b(next)) return null;
            return (
              <Slam key={w} at={b(at)} size={230} color={i % 2 ? c.accent : c.fg}>
                {w}
              </Slam>
            );
          })}
        </div>
      </AbsoluteFill>
    </Shot>
  );
};

// ---------- title on the drop ----------

const Title: React.FC = () => (
  <Shot from={b(16)} to={b(24)} enter="zoom" exit="none">
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Slam at={b(16)} size={10}>
        <Wordmark height={112} />
      </Slam>
      <Slam at={b(18)} size={38} weight={400} color={c.muted} style={{ marginTop: 50, letterSpacing: '-0.01em' }}>
        Your Bachs account, in Claude, ChatGPT and other MCP apps.
      </Slam>
    </AbsoluteFill>
  </Shot>
);

// ---------- connect: three screens on the beat ----------

const CARDS = [
  { at: b(24.5), w: 1100, h: 520, el: (s: number) => <ConnectedApps at={s - 40} /> },
  { at: b(26.5), w: 880, h: 520, el: (s: number) => <AddConnector at={s - 52} /> },
  { at: b(28.5), w: 760, h: 650, el: (s: number) => <AllowPage at={s - 44} /> },
];

const Connect: React.FC = () => (
  <Shot from={b(24)} to={b(32)} enter="none" exit="zoom">
    <div style={{ position: 'absolute', top: 64, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
      <Slam at={b(24)} size={76}>
        Connected in <span style={{ color: c.accent }}>about a minute.</span>
      </Slam>
    </div>
    {CARDS.map((cd, i) => {
      const end = CARDS[i + 1]?.at ?? b(32);
      return (
        <Shot key={i} from={cd.at} to={end} enter="whip" exit={i < 2 ? 'whip' : 'none'}>
          <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 90 }}>
            <div style={{ position: 'relative', width: cd.w, height: cd.h, borderRadius: 22, overflow: 'hidden', background: '#fff', boxShadow: '0 50px 120px rgba(0,0,0,0.55)' }}>{cd.el(cd.at)}</div>
          </AbsoluteFill>
        </Shot>
      );
    })}
  </Shot>
);

// ---------- ask: four questions, one every two bars ----------

const ASKS = [
  { q: QS[0], at: 32, label: 'Money and payouts' },
  { q: QS[1], at: 40, label: 'Find anything' },
  { q: QS[3], at: 48, label: 'Payouts' },
  { q: QS[4], at: 56, label: 'Developers' },
];

const AskShot: React.FC<{ i: number }> = ({ i }) => {
  const f = useCurrentFrame();
  const { q, at, label } = ASKS[i];
  const s = b(at);
  const keys = keyFrames(q.ask, s + 2, s + b(1.5));
  const shown = q.ask.slice(0, keys.filter((t) => f >= t).length);
  const chip = k(f, b(at + 2), b(at + 2) + 6, OUT);
  const card = k(f, b(at + 2.5), b(at + 2.5) + 10, OUT);
  return (
    <Shot from={s} to={b(at + 8)} enter={i === 0 ? 'zoom' : 'whip'} exit={i === 3 ? 'none' : 'whip'}>
      <div style={{ position: 'absolute', left: 140, top: 150, width: 1640 }}>
        <div style={{ fontFamily: fonts.mono, fontSize: 22, letterSpacing: '0.14em', color: c.accent }}>
          0{i + 1} · {label.toUpperCase()}
        </div>
        <div style={{ marginTop: 18, fontFamily: fonts.sans, fontWeight: 600, fontSize: 70, letterSpacing: '-0.035em', lineHeight: 1.1, color: c.fg, maxWidth: 1500 }}>
          “{shown}
          {shown.length < q.ask.length ? <span style={{ display: 'inline-block', width: 4, height: 64, marginLeft: 4, verticalAlign: '-8px', background: c.fg }} /> : '”'}
        </div>
      </div>
      <div style={{ position: 'absolute', left: 140, top: 395, opacity: chip, transform: `scale(${1.2 - 0.2 * chip})`, transformOrigin: 'left center' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, height: 50, padding: '0 22px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.06)', fontFamily: fonts.mono, fontSize: 24, color: c.fg }}>
          <Check size={22} color={c.accent} /> Bachs · {q.tool}
        </span>
      </div>
      <div style={{ position: 'absolute', left: 140, top: 480, width: 1260, perspective: 1600 }}>
        <div
          style={{
            borderRadius: 24,
            background: '#fff',
            padding: '30px 36px 34px',
            boxShadow: '0 60px 140px rgba(0,0,0,0.6)',
            fontFamily: fonts.sans,
            fontSize: 33,
            lineHeight: 1.4,
            color: c.ink,
            opacity: card,
            transformOrigin: 'left center',
            transform: `translateX(${(1 - card) * 260}px) rotateY(${(1 - card) * -32}deg)`,
            filter: `blur(${(1 - card) * 10}px)`,
          }}
        >
          <div style={{ marginBottom: 10 }}>
            <Badge tone="sandbox">Test data</Badge>
          </div>
          {q.answer}
        </div>
      </div>
    </Shot>
  );
};

// ---------- proof ----------

const Trust: React.FC = () => (
  <Shot from={b(64)} to={b(72)} enter="none" exit="zoom">
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Slam at={b(64)} size={240}>
        Read-only.
      </Slam>
      <Slam at={b(65.5)} size={44} weight={400} color={c.muted} style={{ marginTop: 26, letterSpacing: '-0.01em' }}>
        It can't move money or change anything.
      </Slam>
      <div style={{ marginTop: 70, height: 72, display: 'flex', gap: 22 }}>
        {['Disconnect any time', 'Card numbers stay hidden', 'Sandbox answers say test data'].map((t, i) => (
          <Slam key={t} at={b(68 + i)} size={30} weight={500} style={{ letterSpacing: '-0.01em', padding: '18px 30px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.22)', background: 'rgba(255,255,255,0.06)' }}>
            {t}
          </Slam>
        ))}
      </div>
    </AbsoluteFill>
  </Shot>
);

const Areas: React.FC = () => {
  const f = useCurrentFrame();
  const n = Math.round(53 * k(f, b(72), b(74.5), Easing.bezier(0.2, 0.6, 0.2, 1)));
  return (
    <Shot from={b(72)} to={b(80)} enter="zoom" exit="none">
      <div style={{ position: 'absolute', left: 150, top: 240 }}>
        <Slam at={b(72)} size={360} color={c.accent} style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.06em' }}>
          {n}
        </Slam>
        <Slam at={b(72.5)} size={56} style={{ marginTop: -10 }}>
          kinds of record.
        </Slam>
        <Slam at={b(74)} size={56} color={c.muted}>
          In 9 areas.
        </Slam>
      </div>
      <div style={{ position: 'absolute', left: 940, top: 250, width: 840, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {AREAS.map((a, i) => {
          const t = k(f, b(74 + i * 0.5), b(74 + i * 0.5) + 6, OUT);
          return (
            <div key={a} style={{ height: 120, borderRadius: 16, padding: '18px 20px', display: 'flex', alignItems: 'flex-end', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', fontFamily: fonts.sans, fontWeight: 600, fontSize: 25, lineHeight: 1.15, color: c.fg, opacity: t, transform: `scale(${1.15 - 0.15 * t})`, filter: `blur(${(1 - t) * 8}px)` }}>
              {a}
            </div>
          );
        })}
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 880, display: 'flex', justifyContent: 'center' }}>
        <Slam at={b(78.5)} size={34} weight={400} color={c.fg} style={{ letterSpacing: '-0.01em' }}>
          In our tests, Claude answered all 20 merchant questions correctly.
        </Slam>
      </div>
    </Shot>
  );
};

const Works: React.FC = () => (
  <>
    <Shot from={b(80)} to={b(84)} enter="none" exit="whip">
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Slam at={b(80)} size={44} weight={400} color={c.muted} style={{ letterSpacing: '-0.01em' }}>
          Works with
        </Slam>
        <div style={{ marginTop: 34, height: 130, display: 'flex', gap: 26 }}>
          {['Claude', 'ChatGPT'].map((n, i) => (
            <Slam key={n} at={b(81 + i)} size={84} weight={600} style={{ padding: '14px 46px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.22)', background: 'rgba(255,255,255,0.06)' }}>
              {n}
            </Slam>
          ))}
        </div>
        <Slam at={b(83)} size={44} weight={400} color={c.muted} style={{ marginTop: 34, letterSpacing: '-0.01em' }}>
          and other apps that support MCP
        </Slam>
      </AbsoluteFill>
    </Shot>
    <Shot from={b(84)} to={b(88)} enter="whip" exit="zoom">
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Slam at={b(84)} size={108}>
          Almost everything in your dashboard,
        </Slam>
        <Slam at={b(86)} size={108} color={c.accent}>
          in a conversation.
        </Slam>
      </AbsoluteFill>
    </Shot>
  </>
);

const End: React.FC = () => {
  const f = useCurrentFrame();
  const out = k(f, edit.total - 20, edit.total, IN);
  return (
    <>
      <Shot from={b(88)} to={b(95.5)} enter="zoom" exit="zoom">
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
          <Slam at={b(88)} size={44} weight={400} color={c.muted} style={{ letterSpacing: '-0.01em' }}>
            Connect it from
          </Slam>
          <Slam at={b(90)} size={58} weight={500} style={{ marginTop: 26, fontFamily: fonts.mono, letterSpacing: '-0.02em' }}>
            Developers › Connected apps
          </Slam>
          <Slam at={b(92)} size={36} weight={400} color={c.muted} style={{ marginTop: 34, letterSpacing: '-0.01em' }}>
            Live and sandbox, side by side.
          </Slam>
        </AbsoluteFill>
      </Shot>
      {f >= b(96) && (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: 1 - out }}>
          <Slam at={b(96)} size={10}>
            <Wordmark height={100} />
          </Slam>
        </AbsoluteFill>
      )}
    </>
  );
};

export const McpHype: React.FC = () => (
  <AbsoluteFill style={{ background: c.bg, overflow: 'hidden' }}>
    <style>{fontFaceCss}</style>
    <Ambient />
    <Hook />
    <Title />
    <Connect />
    {ASKS.map((_, i) => (
      <AskShot key={i} i={i} />
    ))}
    <Trust />
    <Areas />
    <Works />
    <End />
    <Flash at={b(16)} />
    <Flash at={b(72)} />
    <Flash at={b(96)} />
    <Wipe at={b(24)} />
    <Wipe at={b(64)} />
    <Wipe at={b(80)} />
    <Grain />
    <Audio src={staticFile('audio/mcphype-mix.wav')} />
  </AbsoluteFill>
);
