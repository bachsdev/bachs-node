import React from 'react';
import { AbsoluteFill, Audio, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Words } from '../components';
import { clamp, ease } from '../motion';
import { fontFaceCss, fonts } from '../theme';
import { at, BEAT, cue, term, termTimes, typed } from './grid';
import { sk } from './Styleframes';

/* ------------------------------------------------------------------ */
/* Shared pieces                                                       */
/* ------------------------------------------------------------------ */

const sp = (frame: number, from: number, damping = 16, stiffness = 140) =>
  spring({ frame: frame - from, fps: 30, config: { damping, stiffness, mass: 0.8 } });

// Visible window with short fades at both ends.
const win = (frame: number, from: number, to: number, fadeIn = 8, fadeOut = 8) =>
  Math.min(ease(frame, [from, from + fadeIn], [0, 1]), 1 - ease(frame, [to - fadeOut, to], [0, 1]));

const Paper: React.FC<{ bg?: string; children?: React.ReactNode; opacity?: number }> = ({ bg = sk.paper, children, opacity = 1 }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: bg, opacity }}>
      <AbsoluteFill
        style={{
          backgroundImage: `radial-gradient(${bg === sk.paper ? 'rgba(34,35,55,0.09)' : 'rgba(255,255,255,0.06)'} 1.2px, transparent 1.3px)`,
          backgroundSize: '28px 28px',
          backgroundPosition: `${(frame * 0.15) % 28}px ${(frame * 0.08) % 28}px`,
        }}
      />
      {children}
    </AbsoluteFill>
  );
};

const Cap: React.FC<{ text: string; from: number; to: number; highlight?: string[]; dark?: boolean; top?: number }> = ({
  text,
  from,
  to,
  highlight,
  dark,
  top = 96,
}) => {
  const frame = useCurrentFrame();
  const o = win(frame, from, to, 4, 8);
  if (o <= 0) return null;
  return (
    <div style={{ position: 'absolute', top, left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity: o, filter: `blur(${(1 - o) * 6}px)`, zIndex: 5 }}>
      <Words
        text={text}
        delay={from}
        stagger={2}
        highlight={highlight}
        highlightColor={sk.coral}
        style={{ fontFamily: fonts.sans, fontWeight: 560, fontSize: 52, letterSpacing: '-0.025em', color: dark ? '#f4f3f8' : sk.ink, maxWidth: 1500 }}
      />
    </div>
  );
};

// Two-part caption: the second half arrives on its own beat.
const SplitCap: React.FC<{ a: string; b: string; fromA: number; fromB: number; to: number }> = ({ a, b, fromA, fromB, to }) => {
  const frame = useCurrentFrame();
  const o = win(frame, fromA, to, 4, 8);
  if (o <= 0) return null;
  const style = { fontFamily: fonts.sans, fontWeight: 560, fontSize: 52, letterSpacing: '-0.025em', color: sk.ink };
  return (
    <div style={{ position: 'absolute', top: 96, left: 0, right: 0, display: 'flex', justifyContent: 'center', columnGap: 14, opacity: o, zIndex: 5 }}>
      <Words text={a} delay={fromA} stagger={2} style={style} />
      <Words text={b} delay={fromB} stagger={2} style={{ ...style, color: sk.coral }} />
    </div>
  );
};

const Caret: React.FC<{ on: boolean; h?: number; w?: number }> = ({ on, h = 36, w = 15 }) => (
  <span style={{ display: 'inline-block', width: w, height: h, background: sk.coral, marginLeft: 4, verticalAlign: 'middle', opacity: on ? 1 : 0 }} />
);

/* ------------------------------------------------------------------ */
/* A. Terminal: install + prompt (bars 1–5)                            */
/* ------------------------------------------------------------------ */

const Terminal: React.FC = () => {
  const frame = useCurrentFrame();
  const appear = sp(frame, 0, 20, 90);
  const blink = Math.floor(frame / 12) % 2 === 0;
  const lastKey = (times: number[]) => times[times.length - 1];
  const typing = (times: number[]) => frame >= times[0] - 2 && frame <= lastKey(times) + 6;
  // Enter: the prompt flashes, then the whole terminal lifts away.
  const enter = ease(frame, [cue.cardUnfold - 2, cue.cardUnfold + 14], [0, 1]);
  const flash = interpolate(frame, [term.enter, term.enter + 2, term.enter + 10], [0, 1, 0], clamp);
  const ok = (f: number) => sp(frame, f, 13, 220);

  const activeLine =
    frame < term.market.start ? 'claude' : frame < term.install.start ? 'market' : frame < term.prompt.start - 2 ? 'install' : 'prompt';
  const caretOn = (name: string, times: number[]) => activeLine === name && (typing(times) || blink);

  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div
        style={{
          width: 1320,
          marginTop: 90,
          background: sk.ink,
          borderRadius: 20,
          overflow: 'hidden',
          boxShadow: `12px 12px 0 ${sk.lilac}`,
          opacity: Math.min(1, appear * 1.3) * (1 - enter),
          transform: `translateY(${(1 - appear) * 40 - enter * 160}px) scale(${0.97 + appear * 0.03 - enter * 0.06})`,
          filter: `blur(${enter * 10}px)`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, height: 50, padding: '0 20px', background: sk.inkDeep }}>
          {[sk.coral, sk.peach, sk.lilac].map((c) => (
            <div key={c} style={{ width: 13, height: 13, borderRadius: 7, background: c }} />
          ))}
          <div style={{ flex: 1, textAlign: 'center', marginRight: 70, fontFamily: fonts.mono, fontSize: 17, color: '#8d8fab' }}>~/acme-app — claude</div>
        </div>
        <div style={{ padding: '34px 44px 40px', fontFamily: fonts.mono, fontSize: 30, lineHeight: 1.55, color: '#e8e7f2', minHeight: 520 }}>
          <div style={{ color: '#8d8fab' }}>
            $ {typed(term.claude.text, termTimes.claude, frame)}
            <Caret on={caretOn('claude', termTimes.claude)} />
          </div>
          {frame >= term.market.start - 4 && (
            <div style={{ marginTop: 22 }}>
              <span style={{ color: sk.coral, marginRight: 16 }}>&gt;</span>
              {typed(term.market.text, termTimes.market, frame)}
              <Caret on={caretOn('market', termTimes.market)} />
            </div>
          )}
          {frame >= term.marketOk && (
            <div style={{ paddingLeft: 34, color: '#9fe0b0', opacity: ok(term.marketOk), transform: `translateX(${(1 - ok(term.marketOk)) * -14}px)` }}>
              ✓ Added marketplace: bachs
            </div>
          )}
          {frame >= term.install.start - 2 && (
            <div style={{ marginTop: 22 }}>
              <span style={{ color: sk.coral, marginRight: 16 }}>&gt;</span>
              {typed(term.install.text, termTimes.install, frame)}
              <Caret on={caretOn('install', termTimes.install)} />
            </div>
          )}
          {frame >= term.installOk && (
            <div style={{ paddingLeft: 34, color: '#9fe0b0', opacity: ok(term.installOk), transform: `translateX(${(1 - ok(term.installOk)) * -14}px)` }}>
              ✓ Installed plugin: bachs@bachs
            </div>
          )}
          {frame >= term.installOk + 6 && (
            <div
              style={{
                marginTop: 30,
                border: `1.5px solid rgba(233,113,126,${0.55 + flash * 0.45})`,
                background: `rgba(233,113,126,${flash * 0.18})`,
                borderRadius: 12,
                padding: '18px 24px',
                display: 'flex',
                alignItems: 'center',
                opacity: ease(frame, [term.installOk + 6, term.installOk + 14], [0, 1]),
              }}
            >
              <span style={{ color: sk.coral, marginRight: 16 }}>&gt;</span>
              <span style={{ color: '#fff' }}>{typed(term.prompt.text, termTimes.prompt, frame)}</span>
              <Caret on={caretOn('prompt', termTimes.prompt)} />
            </div>
          )}
          {frame >= term.installOk + 10 && (
            <div style={{ marginTop: 14, fontSize: 20, color: '#6d6f8c', opacity: ease(frame, [term.installOk + 10, term.installOk + 20], [0, 1]) }}>
              skill available: bachs · /bachs:bachs
            </div>
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* B. Read the skill, write the code (bars 6–10)                       */
/* ------------------------------------------------------------------ */

const ruleLines = ['Fulfil orders and grant access from verified webhook', 'state. A success redirect or browser event is only a', 'display signal.'];
const ruleLen = ruleLines.reduce((a, l) => a + l.length, 0);

const SkillCard: React.FC<{ frame: number }> = ({ frame }) => {
  const unfold = sp(frame, cue.cardUnfold, 15, 120);
  const tab = ease(frame, [cue.tabSelect, cue.tabSelect + 10], [0, 1]);
  const sweep = ease(frame, [cue.sweep[0], cue.sweep[1]], [0, 1], (t) => t);
  let used = 0;
  const tabs = ['One-time', 'Subscriptions', 'Marketplace', 'Go-live'];
  return (
    <div
      style={{
        position: 'absolute',
        left: 120,
        top: 280,
        width: 780,
        background: sk.card,
        border: `1.5px solid ${sk.ink}`,
        borderRadius: 18,
        boxShadow: `12px 12px 0 ${sk.peach}`,
        overflow: 'hidden',
        transformOrigin: '50% 0%',
        transform: `rotate(${-1.6 * unfold}deg) scaleY(${0.15 + unfold * 0.85}) translateY(${(1 - unfold) * 60}px)`,
        opacity: Math.min(1, unfold * 2),
      }}
    >
      <div style={{ display: 'flex', borderBottom: `1.5px solid ${sk.ink}`, position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, bottom: 0, width: '25%', left: `${tab * 25}%`, background: sk.ink }} />
        {tabs.map((t, i) => (
          <div
            key={t}
            style={{
              flex: 1,
              padding: '16px 0',
              textAlign: 'center',
              fontFamily: fonts.mono,
              fontSize: 16,
              letterSpacing: '0.06em',
              position: 'relative',
              color: (i === 1 && tab > 0.5) || (i === 0 && tab <= 0.5) ? '#fff' : sk.muted,
              borderLeft: i ? `1px solid ${sk.line}` : 'none',
            }}
          >
            {t}
          </div>
        ))}
      </div>
      <div style={{ padding: '30px 38px 40px', fontFamily: fonts.mono, fontSize: 21, lineHeight: 1.62, color: sk.muted }}>
        <div style={{ color: sk.ink, fontSize: 18, letterSpacing: '0.12em', marginBottom: 14 }}>SKILL.md · bachs</div>
        <div style={{ color: sk.ink, fontWeight: 600, fontSize: 26, marginBottom: 12 }}>## Integration rules</div>
        <div>- Start in the sandbox with an sk_sandbox_ key.</div>
        <div>- Send amounts as decimal strings with an ISO currency.</div>
        <div>- Verify X-Bachs-Signature-V2 against the original raw</div>
        <div>&nbsp;&nbsp;request body before parsing JSON.</div>
        <div style={{ marginTop: 6 }}>
          {ruleLines.map((l, i) => {
            const start = used / ruleLen;
            used += l.length;
            const t = interpolate(sweep, [start, used / ruleLen], [0, 1], clamp);
            return (
              <div key={i}>
                {i === 0 ? '- ' : '  '}
                <span
                  style={{
                    color: t > 0 ? sk.ink : undefined,
                    backgroundImage: `linear-gradient(transparent 12%, ${sk.coralSoft} 12%, ${sk.coralSoft} 92%, transparent 92%)`,
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: `${t * 100}% 100%`,
                  }}
                >
                  {l}
                </span>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 6 }}>- Deduplicate event IDs durably …</div>
      </div>
    </div>
  );
};

const kw = (s: string) => <span style={{ color: '#7a5ec7' }}>{s}</span>;
const st = (s: string) => <span style={{ color: '#2f8a5b' }}>{s}</span>;
const cm = (s: string) => <span style={{ color: sk.faint }}>{s}</span>;

const files: { path: string; lines?: React.ReactNode[] }[] = [
  {
    path: 'app/api/webhooks/bachs/route.ts',
    lines: [
      cm('// The SDK verifies the original bytes first.'),
      <>event = webhooks.{kw('constructEvent')}(</>,
      <>  body, req.headers, secret);</>,
      <>{kw('await')} processWebhookEvent(event);</>,
    ],
  },
  {
    path: 'lib/access.ts',
    lines: [
      <>{kw('export function')} hasAccess(sub) {'{'}</>,
      <>  {kw('return')} [{st('"trialing"')}, {st('"active"')},</>,
      <>    {st('"past_due"')}].includes(sub.status);</>,
      <>{'}'}</>,
    ],
  },
  { path: 'app/api/billing/portal/route.ts' },
  { path: 'app/api/checkout/route.ts' },
];

const FileStack: React.FC<{ frame: number }> = ({ frame }) => (
  <div style={{ position: 'absolute', left: 1050, top: 250, width: 760, display: 'flex', flexDirection: 'column', gap: 26 }}>
    {files.map((f, i) => {
      const t = sp(frame, cue.files[i], 13, 170);
      const shown = frame >= cue.files[i] - 1;
      return (
        <div
          key={f.path}
          style={{
            background: sk.card,
            border: `1.5px solid ${sk.ink}`,
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: `8px 8px 0 ${sk.periwinkle}`,
            opacity: shown ? Math.min(1, t * 1.6) : 0,
            transform: `translateY(${(1 - t) * -40}px) rotate(${(1 - t) * (i % 2 ? 2 : -2)}deg)`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', borderBottom: f.lines ? `1px solid ${sk.line}` : 'none', fontFamily: fonts.mono, fontSize: 19, color: sk.ink }}>
            <span style={{ color: sk.coral, marginRight: 12 }}>+</span>
            {f.path}
            <span style={{ marginLeft: 'auto', fontSize: 14, letterSpacing: '0.14em', color: sk.muted }}>NEW</span>
          </div>
          {f.lines && (
            <div style={{ padding: '16px 22px 18px', fontFamily: fonts.mono, fontSize: 18, lineHeight: 1.65, color: sk.ink, whiteSpace: 'pre' }}>
              {f.lines.map((l, j) => (
                <div key={j} style={{ opacity: ease(frame, [cue.files[i] + 3 + j * 3, cue.files[i] + 8 + j * 3], [0, 1]) }}>
                  {l}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    })}
  </div>
);

const LinkLine: React.FC<{ frame: number }> = ({ frame }) => {
  const t = ease(frame, [cue.link[0], cue.link[1]], [0, 1]);
  const len = 420;
  return (
    <svg width="1920" height="1080" style={{ position: 'absolute', inset: 0 }}>
      <defs>
        <mask id="reveal">
          <path d="M 880 700 C 960 700, 950 520, 1040 500" fill="none" stroke="#fff" strokeWidth="12" strokeDasharray={len} strokeDashoffset={len * (1 - t)} />
        </mask>
      </defs>
      <path d="M 880 700 C 960 700, 950 520, 1040 500" fill="none" stroke={sk.coral} strokeWidth="4" strokeLinecap="round" strokeDasharray="2 12" mask="url(#reveal)" />
      <circle cx="1040" cy="500" r={7 * ease(frame, [cue.link[1] - 4, cue.link[1] + 4], [0, 1])} fill={sk.coral} />
    </svg>
  );
};

const ReadWrite: React.FC = () => {
  const frame = useCurrentFrame();
  // Camera pushes into the highlighted rule at bar 10.
  const push = ease(frame, [cue.rulePush - 2, cue.rulePush + 22], [0, 1], (t) => t * t * t);
  return (
    <AbsoluteFill style={{ transformOrigin: '500px 690px', transform: `scale(${1 + push * 2.4})`, filter: `blur(${push * 6}px)`, opacity: 1 - ease(frame, [cue.rulePush + 14, cue.rulePush + 24], [0, 1]) }}>
      <SkillCard frame={frame} />
      <LinkLine frame={frame} />
      <FileStack frame={frame} />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* C. The rule, full screen (bars 10–11)                               */
/* ------------------------------------------------------------------ */

const Rule: React.FC = () => {
  const frame = useCurrentFrame();
  const inT = sp(frame, cue.rulePush + 12, 20, 90);
  const hl = ease(frame, [cue.rulePush + 26, cue.rulePush + 50], [0, 1]);
  const sub = sp(frame, cue.ruleSub, 18, 120);
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 1440, opacity: Math.min(1, inT * 1.4), transform: `scale(${1.08 - inT * 0.08})`, filter: `blur(${(1 - Math.min(inT, 1)) * 10}px)` }}>
        <div style={{ fontFamily: fonts.mono, fontSize: 22, letterSpacing: '0.16em', color: sk.muted, marginBottom: 30 }}>SKILL.md · INTEGRATION RULES</div>
        <div style={{ fontFamily: fonts.sans, fontWeight: 600, fontSize: 84, lineHeight: 1.12, letterSpacing: '-0.035em', color: sk.ink }}>
          A success redirect or browser event is{' '}
          <span
            style={{
              backgroundImage: `linear-gradient(transparent 58%, ${sk.coralSoft} 58%, ${sk.coralSoft} 94%, transparent 94%)`,
              backgroundRepeat: 'no-repeat',
              backgroundSize: `${hl * 100}% 100%`,
            }}
          >
            only a display signal.
          </span>
        </div>
        <div
          style={{
            marginTop: 40,
            fontFamily: fonts.mono,
            fontSize: 30,
            color: sk.coral,
            opacity: Math.min(1, sub * 1.5),
            transform: `translateY(${(1 - sub) * 16}px)`,
          }}
        >
          → access comes from verified webhooks.
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* D. Tests on the drop (bars 12–13)                                   */
/* ------------------------------------------------------------------ */

const tests = ['Invalid signature rejected', 'Duplicate delivery ignored', "Older event can't overwrite newer state"];

const Tests: React.FC = () => {
  const frame = useCurrentFrame();
  const slam = sp(frame, cue.drop, 11, 260);
  const shake = frame >= cue.drop && frame < cue.drop + 6 ? Math.sin((frame - cue.drop) * 3) * (6 - (frame - cue.drop)) : 0;
  const done = sp(frame, cue.testsDone, 14, 200);
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div
        style={{
          width: 1180,
          marginTop: 90,
          background: sk.ink,
          borderRadius: 20,
          overflow: 'hidden',
          boxShadow: `14px 14px 0 ${sk.coral}`,
          transform: `scale(${1.18 - slam * 0.18}) translate(${shake}px, ${shake * 0.5}px)`,
          opacity: Math.min(1, slam * 3),
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, height: 50, padding: '0 20px', background: sk.inkDeep }}>
          {[sk.coral, sk.peach, sk.lilac].map((c) => (
            <div key={c} style={{ width: 13, height: 13, borderRadius: 7, background: c }} />
          ))}
          <div style={{ flex: 1, textAlign: 'center', marginRight: 70, fontFamily: fonts.mono, fontSize: 17, color: '#8d8fab' }}>~/acme-app — npm test</div>
        </div>
        <div style={{ padding: '36px 48px 40px', fontFamily: fonts.mono, fontSize: 34, lineHeight: 1.9, color: '#e8e7f2' }}>
          <div style={{ color: '#8d8fab', fontSize: 24 }}>webhooks.test.ts</div>
          {tests.map((t, i) => {
            const s = sp(frame, cue.tests[i], 13, 220);
            return (
              <div key={t} style={{ opacity: frame >= cue.tests[i] ? Math.min(1, s * 2) : 0.18, transform: `translateX(${frame >= cue.tests[i] ? (1 - s) * -16 : 0}px)` }}>
                <span style={{ color: frame >= cue.tests[i] ? '#9fe0b0' : '#55577a', marginRight: 22 }}>{frame >= cue.tests[i] ? '✓' : '○'}</span>
                {t}
              </div>
            );
          })}
          <div style={{ marginTop: 14, fontSize: 26, color: '#9fe0b0', opacity: frame >= cue.testsDone ? Math.min(1, done * 2) : 0 }}>3 passed</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* E. Go-live review receipt (bars 14–16)                              */
/* ------------------------------------------------------------------ */

const zigzag = (w: number, flip = false) => {
  const teeth = 36;
  const step = w / teeth;
  let d = flip ? `M0 0 ` : `M0 14 `;
  for (let i = 0; i < teeth; i++) {
    d += flip ? `L${i * step + step / 2} 14 L${(i + 1) * step} 0 ` : `L${i * step + step / 2} 0 L${(i + 1) * step} 14 `;
  }
  return d + (flip ? `L${w} 0 L0 0 Z` : `L${w} 14 L0 14 Z`);
};

const findings: { level: 'HIGH' | 'MED' | 'LOW'; where: string; what: string }[] = [
  { level: 'HIGH', where: 'app/api/checkout/route.ts:18', what: 'Price read from the request body' },
  { level: 'HIGH', where: 'app/billing/success/page.tsx:12', what: 'Access granted on the success redirect' },
  { level: 'MED', where: 'lib/webhooks.ts:41', what: 'No duplicate-event check' },
  { level: 'LOW', where: '.env.production:3', what: 'sk_sandbox_ key set for production' },
];

// Printed height (px) after each print cue: header, four findings, the "not checked" note.
const printStops = [112, 204, 296, 388, 480, 604];

const Receipt: React.FC = () => {
  const frame = useCurrentFrame();
  let target = 0;
  let prev = 0;
  cue.print.forEach((f, i) => {
    if (frame >= f) {
      prev = i ? printStops[i - 1] : 0;
      target = interpolate(frame, [f, f + BEAT * 0.8], [prev, printStops[i]], { ...clamp, easing: (t) => 1 - Math.pow(1 - t, 2) });
    }
  });
  const stampT = sp(frame, cue.stamp, 10, 260);
  const stampOn = frame >= cue.stamp;
  const fullH = 770;
  const shown = stampOn ? interpolate(frame, [cue.stamp, cue.stamp + 6], [printStops[5], fullH], clamp) : target;
  return (
    <AbsoluteFill>
      {/* The printer slot. */}
      <div style={{ position: 'absolute', left: 1920 / 2 - 450, top: 196, width: 900, height: 22, borderRadius: 11, background: '#0f0e1f', boxShadow: 'inset 0 4px 8px rgba(0,0,0,0.6)' }} />
      <div style={{ position: 'absolute', left: 1920 / 2 - 400, top: 206, width: 800, height: shown, overflow: 'hidden' }}>
        <div style={{ filter: 'drop-shadow(0 30px 40px rgba(0,0,0,0.4))' }}>
          <div style={{ background: sk.receipt, padding: '30px 52px 26px', fontFamily: fonts.mono, fontSize: 22, color: sk.ink }}>
            <div style={{ textAlign: 'center', letterSpacing: '0.3em', fontSize: 20 }}>BACHS · GO-LIVE REVIEW</div>
            <div style={{ textAlign: 'center', color: sk.muted, fontSize: 17, marginTop: 8 }}>acme-app · 4 findings · ordered by risk</div>
            <div style={{ borderTop: `2px solid ${sk.ink}`, margin: '20px 0 4px' }} />
            {findings.map((f, i) => (
              <div key={f.where} style={{ display: 'flex', gap: 18, padding: '14px 0', height: 92, boxSizing: 'border-box', borderBottom: `1.5px dashed rgba(34,35,55,0.18)` }}>
                <span style={{ color: sk.faint, width: 26 }}>0{i + 1}</span>
                <span
                  style={{
                    width: 66,
                    textAlign: 'center',
                    fontSize: 15,
                    letterSpacing: '0.1em',
                    alignSelf: 'flex-start',
                    marginTop: 3,
                    padding: '3px 0',
                    borderRadius: 6,
                    color: f.level === 'HIGH' ? '#fff' : sk.ink,
                    background: f.level === 'HIGH' ? sk.coral : f.level === 'MED' ? sk.peach : sk.lilac,
                  }}
                >
                  {f.level}
                </span>
                <div style={{ flex: 1 }}>
                  <div>{f.where}</div>
                  <div style={{ color: sk.muted, fontSize: 19, marginTop: 4 }}>{f.what}</div>
                </div>
              </div>
            ))}
            <div style={{ color: sk.muted, fontSize: 18, marginTop: 18, lineHeight: 1.5, height: 70 }}>Not checked: a real sandbox payment. A code review is not a sandbox test.</div>
            <div style={{ borderTop: `2px solid ${sk.ink}`, margin: '16px 0 18px' }} />
            <div style={{ height: 96 }} />
          </div>
          <svg width="800" height="14" style={{ display: 'block' }}>
            <path d={zigzag(800, true)} fill={sk.receipt} />
          </svg>
        </div>
      </div>
      {/* The stamp lands on the beat. */}
      {stampOn && (
        <div
          style={{
            position: 'absolute',
            left: 1920 / 2 - 260,
            top: 206 + 612,
            width: 520,
            textAlign: 'center',
            fontFamily: fonts.mono,
            fontWeight: 700,
            fontSize: 40,
            letterSpacing: '0.2em',
            color: sk.coral,
            border: `4px solid ${sk.coral}`,
            borderRadius: 10,
            padding: '8px 0',
            transform: `rotate(-4deg) scale(${1.9 - stampT * 0.9})`,
            opacity: Math.min(1, stampT * 2.5),
          }}
        >
          NO CODE CHANGED
        </div>
      )}
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* F. Works where you work (bars 17–18)                                */
/* ------------------------------------------------------------------ */

const tools = [
  { name: 'Claude Code', shadow: sk.lilac },
  { name: 'Cursor', shadow: sk.peach },
  { name: 'GitHub Copilot', shadow: sk.periwinkle },
  { name: 'Codex', shadow: sk.coralSoft },
];

const Everywhere: React.FC = () => {
  const frame = useCurrentFrame();
  const any = sp(frame, cue.anyChat, 18, 120);
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', gap: 30, marginTop: 60 }}>
        {tools.map((t, i) => {
          const s = sp(frame, cue.names[i], 12, 220);
          const on = frame >= cue.names[i];
          return (
            <div
              key={t.name}
              style={{
                padding: '26px 40px',
                background: sk.card,
                border: `1.5px solid ${sk.ink}`,
                borderRadius: 18,
                boxShadow: `10px 10px 0 ${t.shadow}`,
                fontFamily: fonts.sans,
                fontWeight: 600,
                fontSize: 54,
                letterSpacing: '-0.03em',
                color: sk.ink,
                opacity: on ? Math.min(1, s * 2) : 0,
                transform: `translateY(${(1 - s) * 50}px) rotate(${(1 - s) * (i % 2 ? 4 : -4)}deg)`,
              }}
            >
              {t.name}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 56, fontFamily: fonts.mono, fontSize: 28, color: sk.muted, opacity: frame >= cue.anyChat ? any : 0, transform: `translateY(${(1 - any) * 12}px)` }}>
        or paste it into any chat
      </div>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* G. Outro (bars 19–20)                                               */
/* ------------------------------------------------------------------ */

const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const a = sp(frame, cue.outro, 18, 110);
  const b = sp(frame, cue.outro + BEAT, 15, 150);
  const c = sp(frame, cue.docs, 18, 120);
  const fin = sp(frame, cue.final, 20, 90);
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', transform: `scale(${1 + fin * 0.02})` }}>
        <div style={{ fontFamily: fonts.sans, fontWeight: 600, fontSize: 110, letterSpacing: '-0.045em', color: sk.ink, opacity: Math.min(1, a * 1.5), transform: `translateY(${(1 - a) * 30}px)` }}>
          The Bachs skill.
        </div>
        <div style={{ fontFamily: fonts.sans, fontWeight: 600, fontSize: 110, letterSpacing: '-0.045em', color: sk.coral, marginTop: -8, opacity: Math.min(1, b * 1.5), transform: `translateY(${(1 - b) * 30}px)` }}>
          Install once.
        </div>
        <div
          style={{
            marginTop: 54,
            padding: '20px 34px',
            borderRadius: 16,
            background: sk.ink,
            boxShadow: `10px 10px 0 ${sk.lilac}`,
            fontFamily: fonts.mono,
            fontSize: 34,
            color: '#f4f3f8',
            opacity: Math.min(1, b * 1.5),
          }}
        >
          <span style={{ color: sk.coral }}>&gt;</span> /plugin install bachs@bachs
        </div>
        <div style={{ marginTop: 40, display: 'flex', alignItems: 'center', gap: 18, opacity: Math.min(1, c * 1.4), transform: `translateY(${(1 - c) * 14}px)` }}>
          <Img src={staticFile('brand/bachs-logo.svg')} style={{ width: 40, height: 40 }} />
          <span style={{ fontFamily: fonts.mono, fontSize: 28, color: sk.muted }}>docs.bachs.io/build/ai/skills</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* Assembly                                                            */
/* ------------------------------------------------------------------ */

export const SkillsVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const navy = frame >= cue.review && frame < cue.everywhere;
  // Page-turn wipe back to paper on bar 17: a sheet sweeps in from the right.
  const wipe = ease(frame, [cue.everywhere - 10, cue.everywhere], [0, 1], (t) => t * t);
  const fadeOut = ease(frame, [durationInFrames - 20, durationInFrames], [0, 1]);
  return (
    <AbsoluteFill style={{ background: sk.paper }}>
      <style>{fontFaceCss}</style>
      <Paper />

      {frame < cue.cardUnfold + 16 && <Terminal />}
      <Cap text="Your assistant doesn't know Bachs. Yet." highlight={['Yet']} from={2} to={at(3, 1)} />
      <Cap text="Teach your assistant Bachs. Two commands." highlight={['Two', 'commands']} from={at(3, 1)} to={cue.cardUnfold} />

      {frame >= cue.cardUnfold - 2 && frame < cue.rulePush + 26 && <ReadWrite />}
      <SplitCap a="It reads the rules." b="Then it writes the code." fromA={cue.tabSelect} fromB={cue.link[0]} to={cue.rulePush + 6} />

      {frame >= cue.rulePush + 10 && frame < cue.drop && <Rule />}

      {frame >= cue.drop && frame < cue.review && <Tests />}
      <Cap text="Then it tests the edge cases." highlight={['edge', 'cases']} from={cue.drop} to={cue.review} />

      {navy && (
        <>
          <Paper bg={sk.inkDeep} />
          <Receipt />
          <Cap text="Before you launch, it checks your work." highlight={['it', 'checks', 'your', 'work']} from={cue.review} to={cue.everywhere} dark />
        </>
      )}
      {wipe > 0 && frame < cue.everywhere && (
        <div style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: `${wipe * 100}%`, background: sk.paper, boxShadow: '-30px 0 60px rgba(0,0,0,0.35)' }} />
      )}

      {frame >= cue.everywhere && frame < cue.outro + 10 && (
        <div style={{ position: 'absolute', inset: 0, opacity: 1 - ease(frame, [cue.outro - 4, cue.outro + 8], [0, 1]) }}>
          <Everywhere />
        </div>
      )}
      <Cap text="Works where you work." highlight={['you', 'work']} from={cue.everywhere} to={cue.outro} />

      {frame >= cue.outro - 2 && <Outro />}

      <AbsoluteFill style={{ background: sk.paper, opacity: fadeOut }} />
      <Audio src={staticFile('audio/skills-mix.wav')} />
    </AbsoluteFill>
  );
};
