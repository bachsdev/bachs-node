import React from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';
import { fontFaceCss, fonts } from '../theme';

// Skills video palette, taken from the Bachs journal (bachs-landing-astro/src/styles/blog.css).
export const sk = {
  paper: '#fbfbfd',
  card: '#ffffff',
  ink: '#222337',
  inkDeep: '#1b1a30',
  muted: '#62647b',
  faint: '#aaaac0',
  coral: '#e9717e',
  coralSoft: 'rgba(242,135,140,0.32)',
  lilac: '#e9d5ff',
  periwinkle: '#b8c5ff',
  peach: '#f5cbbd',
  line: 'rgba(34,35,55,0.10)',
  receipt: '#fbf8f1',
};

export const Base: React.FC<{ bg?: string; children: React.ReactNode; dots?: boolean }> = ({ bg = sk.paper, children, dots = true }) => (
  <AbsoluteFill style={{ background: bg }}>
    <style>{fontFaceCss}</style>
    {dots && (
      <AbsoluteFill
        style={{
          backgroundImage: `radial-gradient(${bg === sk.paper ? 'rgba(34,35,55,0.09)' : 'rgba(255,255,255,0.06)'} 1.2px, transparent 1.3px)`,
          backgroundSize: '28px 28px',
        }}
      />
    )}
    {children}
  </AbsoluteFill>
);

const Caption: React.FC<{ children: React.ReactNode; color?: string; top?: number }> = ({ children, color = sk.ink, top = 96 }) => (
  <div
    style={{
      position: 'absolute',
      top,
      left: 0,
      right: 0,
      textAlign: 'center',
      fontFamily: fonts.sans,
      fontWeight: 560,
      fontSize: 52,
      letterSpacing: '-0.025em',
      color,
    }}
  >
    {children}
  </div>
);

/* 1. Cold open: Claude Code in a terminal ----------------------------- */
const TLine: React.FC<{ children: React.ReactNode; color?: string; indent?: boolean; mt?: number }> = ({ children, color = '#e8e7f2', indent, mt = 0 }) => (
  <div style={{ color, paddingLeft: indent ? 34 : 0, marginTop: mt }}>{children}</div>
);
const Prompt: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <TLine mt={22}>
    <span style={{ color: sk.coral, marginRight: 16 }}>&gt;</span>
    {children}
  </TLine>
);

export const FrameColdOpen: React.FC = () => (
  <Base>
    <Caption>
      Teach your assistant Bachs. <span style={{ color: sk.coral }}>Two commands.</span>
    </Caption>
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div
        style={{
          width: 1320,
          marginTop: 90,
          background: sk.ink,
          borderRadius: 20,
          overflow: 'hidden',
          boxShadow: `12px 12px 0 ${sk.lilac}`,
          border: `1.5px solid ${sk.ink}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, height: 50, padding: '0 20px', background: sk.inkDeep }}>
          {[sk.coral, sk.peach, sk.lilac].map((c) => (
            <div key={c} style={{ width: 13, height: 13, borderRadius: 7, background: c }} />
          ))}
          <div style={{ flex: 1, textAlign: 'center', marginRight: 70, fontFamily: fonts.mono, fontSize: 17, color: '#8d8fab' }}>~/acme-app — claude</div>
        </div>
        <div style={{ padding: '34px 44px 40px', fontFamily: fonts.mono, fontSize: 30, lineHeight: 1.55 }}>
          <TLine color="#8d8fab">$ claude</TLine>
          <Prompt>/plugin marketplace add bachsdev/bachs-skills</Prompt>
          <TLine indent color="#9fe0b0">✓ Added marketplace: bachs</TLine>
          <Prompt>/plugin install bachs@bachs</Prompt>
          <TLine indent color="#9fe0b0">✓ Installed plugin: bachs@bachs</TLine>
          <div style={{ marginTop: 30, border: `1.5px solid rgba(233,113,126,0.55)`, borderRadius: 12, padding: '18px 24px', display: 'flex', alignItems: 'center' }}>
            <span style={{ color: sk.coral, marginRight: 16 }}>&gt;</span>
            <span style={{ color: '#fff' }}>Add subscriptions to this app.</span>
            <span style={{ display: 'inline-block', width: 16, height: 38, background: sk.coral, marginLeft: 6 }} />
          </div>
          <TLine color="#6d6f8c" mt={14}>
            <span style={{ fontSize: 20 }}>skill available: bachs · /bachs:bachs</span>
          </TLine>
        </div>
      </div>
    </AbsoluteFill>
  </Base>
);

/* 2. Reading the skill -------------------------------------------------- */
const Hl: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ background: `linear-gradient(transparent 12%, ${sk.coralSoft} 12%, ${sk.coralSoft} 92%, transparent 92%)`, color: sk.ink, padding: '0 2px', borderRadius: 3 }}>
    {children}
  </span>
);

const FileCard: React.FC<{ path: string; lines?: React.ReactNode[]; style?: React.CSSProperties; tag?: string }> = ({ path, lines, style, tag }) => (
  <div
    style={{
      background: sk.card,
      border: `1.5px solid ${sk.ink}`,
      borderRadius: 16,
      overflow: 'hidden',
      boxShadow: `8px 8px 0 ${sk.periwinkle}`,
      ...style,
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', borderBottom: lines ? `1px solid ${sk.line}` : 'none', fontFamily: fonts.mono, fontSize: 19, color: sk.ink }}>
      <span style={{ color: sk.coral, marginRight: 12 }}>+</span>
      {path}
      {tag && <span style={{ marginLeft: 'auto', fontSize: 14, letterSpacing: '0.14em', color: sk.muted }}>{tag}</span>}
    </div>
    {lines && (
      <div style={{ padding: '16px 22px 18px', fontFamily: fonts.mono, fontSize: 18, lineHeight: 1.65, color: sk.ink, whiteSpace: 'pre' }}>
        {lines.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
    )}
  </div>
);

const kw = (s: string) => <span style={{ color: '#7a5ec7' }}>{s}</span>;
const st = (s: string) => <span style={{ color: '#2f8a5b' }}>{s}</span>;
const cm = (s: string) => <span style={{ color: sk.faint }}>{s}</span>;

export const FrameReading: React.FC = () => (
  <Base>
    <Caption>
      It reads the rules. <span style={{ color: sk.coral }}>Then it writes the code.</span>
    </Caption>
    {/* The skill, as an index card. */}
    <div
      style={{
        position: 'absolute',
        left: 120,
        top: 280,
        width: 780,
        height: 560,
        background: sk.card,
        border: `1.5px solid ${sk.ink}`,
        borderRadius: 18,
        transform: 'rotate(-1.6deg)',
        boxShadow: `12px 12px 0 ${sk.peach}`,
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', borderBottom: `1.5px solid ${sk.ink}` }}>
        {['One-time', 'Subscriptions', 'Marketplace', 'Go-live'].map((t, i) => (
          <div
            key={t}
            style={{
              flex: 1,
              padding: '16px 0',
              textAlign: 'center',
              fontFamily: fonts.mono,
              fontSize: 16,
              letterSpacing: '0.06em',
              background: i === 1 ? sk.ink : 'transparent',
              color: i === 1 ? '#fff' : sk.muted,
              borderLeft: i ? `1px solid ${sk.line}` : 'none',
            }}
          >
            {t}
          </div>
        ))}
      </div>
      <div style={{ padding: '30px 38px', fontFamily: fonts.mono, fontSize: 21, lineHeight: 1.62, color: sk.muted }}>
        <div style={{ color: sk.ink, fontSize: 18, letterSpacing: '0.12em', marginBottom: 14 }}>SKILL.md · bachs</div>
        <div style={{ color: sk.ink, fontWeight: 600, fontSize: 26, marginBottom: 12 }}>## Integration rules</div>
        <div>- Start in the sandbox with an sk_sandbox_ key.</div>
        <div>- Send amounts as decimal strings with an ISO currency.</div>
        <div>- Verify X-Bachs-Signature-V2 against the original raw request body before parsing JSON.</div>
        <div style={{ marginTop: 6 }}>
          - <Hl>Fulfil orders and grant access from verified webhook state.</Hl> <Hl>A success redirect or browser event is only a display signal.</Hl>
        </div>
        <div style={{ marginTop: 6 }}>- Deduplicate event IDs durably …</div>
      </div>
    </div>
    {/* Hand-drawn link from the rule to the code it produced. */}
    <svg width="1920" height="1080" style={{ position: 'absolute', inset: 0 }}>
      <path d="M 870 690 C 960 690, 950 520, 1040 500" fill="none" stroke={sk.coral} strokeWidth="4" strokeLinecap="round" strokeDasharray="2 12" />
      <circle cx="1040" cy="500" r="7" fill={sk.coral} />
    </svg>
    {/* What the assistant wrote. */}
    <div style={{ position: 'absolute', left: 1050, top: 250, width: 760, display: 'flex', flexDirection: 'column', gap: 26 }}>
      <FileCard
        path="app/api/webhooks/bachs/route.ts"
        tag="NEW"
        lines={[
          cm('// The SDK verifies the original bytes first.'),
          <>event = webhooks.{kw('constructEvent')}(</>,
          <>  body, req.headers, secret);</>,
          <>{kw('await')} processWebhookEvent(event);</>,
        ]}
      />
      <FileCard
        path="lib/access.ts"
        tag="NEW"
        lines={[
          <>{kw('export function')} hasAccess(sub) {'{'}</>,
          <>  {kw('return')} [{st('"trialing"')}, {st('"active"')},</>,
          <>    {st('"past_due"')}].includes(sub.status);</>,
          <>{'}'}</>,
        ]}
      />
      <FileCard path="app/api/billing/portal/route.ts" tag="NEW" />
      <FileCard path="app/api/checkout/route.ts" tag="NEW" style={{ opacity: 0.55 }} />
    </div>
  </Base>
);

/* 3. Go-live review receipt --------------------------------------------- */
const Row: React.FC<{ n: string; level: 'HIGH' | 'MED' | 'LOW'; where: string; what: string }> = ({ n, level, where, what }) => (
  <div style={{ display: 'flex', gap: 18, padding: '14px 0', borderBottom: `1.5px dashed rgba(34,35,55,0.18)` }}>
    <span style={{ color: sk.faint, width: 26 }}>{n}</span>
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
        color: level === 'HIGH' ? '#fff' : sk.ink,
        background: level === 'HIGH' ? sk.coral : level === 'MED' ? sk.peach : sk.lilac,
      }}
    >
      {level}
    </span>
    <div style={{ flex: 1 }}>
      <div style={{ color: sk.ink }}>{where}</div>
      <div style={{ color: sk.muted, fontSize: 19, marginTop: 4 }}>{what}</div>
    </div>
  </div>
);

const zigzag = (w: number, flip = false) => {
  const teeth = 36;
  const step = w / teeth;
  let d = flip ? `M0 0 ` : `M0 14 `;
  for (let i = 0; i < teeth; i++) {
    d += flip ? `L${i * step + step / 2} 14 L${(i + 1) * step} 0 ` : `L${i * step + step / 2} 0 L${(i + 1) * step} 14 `;
  }
  d += flip ? `L${w} 0 L0 0 Z` : `L${w} 14 L0 14 Z`;
  return d;
};

export const FrameReceipt: React.FC = () => (
  <Base bg={sk.inkDeep}>
    <Caption color="#f4f3f8">
      Before you launch, <span style={{ color: sk.coral }}>it checks your work.</span>
    </Caption>
    <div style={{ position: 'absolute', left: 1920 / 2 - 400, top: 210, width: 800, transform: 'rotate(1.2deg)', filter: 'drop-shadow(0 40px 60px rgba(0,0,0,0.45))' }}>
      <svg width="800" height="14" style={{ display: 'block' }}>
        <path d={zigzag(800)} fill={sk.receipt} />
      </svg>
      <div style={{ background: sk.receipt, padding: '22px 52px 26px', fontFamily: fonts.mono, fontSize: 22, color: sk.ink }}>
        <div style={{ textAlign: 'center', letterSpacing: '0.3em', fontSize: 20 }}>BACHS · GO-LIVE REVIEW</div>
        <div style={{ textAlign: 'center', color: sk.muted, fontSize: 17, marginTop: 8 }}>acme-app · 4 findings · ordered by risk</div>
        <div style={{ borderTop: `2px solid ${sk.ink}`, margin: '20px 0 4px' }} />
        <Row n="01" level="HIGH" where="app/api/checkout/route.ts:18" what="Price read from the request body" />
        <Row n="02" level="HIGH" where="app/billing/success/page.tsx:12" what="Access granted on the success redirect" />
        <Row n="03" level="MED" where="lib/webhooks.ts:41" what="No duplicate-event check" />
        <Row n="04" level="LOW" where=".env.production:3" what="sk_sandbox_ key set for production" />
        <div style={{ color: sk.muted, fontSize: 18, marginTop: 18, lineHeight: 1.5 }}>Not checked: a real sandbox payment. A code review is not a sandbox test.</div>
        <div style={{ borderTop: `2px solid ${sk.ink}`, margin: '20px 0 18px' }} />
        <div style={{ textAlign: 'center', fontSize: 34, letterSpacing: '0.2em', fontWeight: 600 }}>NO CODE CHANGED</div>
      </div>
      <svg width="800" height="14" style={{ display: 'block' }}>
        <path d={zigzag(800, true)} fill={sk.receipt} />
      </svg>
    </div>
    <Img src={staticFile('brand/bachs-logo.svg')} style={{ position: 'absolute', right: 64, bottom: 56, width: 44, height: 44, filter: 'invert(1)', opacity: 0.85 }} />
  </Base>
);
