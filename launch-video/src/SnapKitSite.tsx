import React from 'react';
import { fonts, snap } from './theme';

// A faithful rebuild of snapkit.bachs.io (the docs demo storefront) so it can
// be scrolled, hovered and clicked frame by frame. Laid out at 1440px wide.

const Mark: React.FC<{ size?: number }> = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 22 22" fill="none">
    <path d="M2 7V2h5M15 2h5v5M20 15v5h-5M7 20H2v-5" stroke={snap.ink} strokeWidth="2.2" />
    <circle cx="11" cy="11" r="3" fill={snap.ink} />
  </svg>
);

const Btn: React.FC<{ dark?: boolean; children: React.ReactNode; style?: React.CSSProperties }> = ({ dark, children, style }) => (
  <div
    style={{
      padding: '14px 24px',
      borderRadius: 10,
      fontFamily: fonts.sans,
      fontWeight: 600,
      fontSize: 18,
      background: dark ? snap.ink : '#fff',
      color: dark ? '#fff' : snap.ink,
      border: dark ? 'none' : `1px solid ${snap.line}`,
      textAlign: 'center',
      ...style,
    }}
  >
    {children}
  </div>
);

const Eyebrow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontFamily: fonts.mono, fontSize: 15, letterSpacing: '0.18em', color: snap.ink, display: 'flex', alignItems: 'center', gap: 12 }}>
    <div style={{ width: 26, height: 1, background: snap.ink }} />
    {children}
  </div>
);

const Plan: React.FC<{
  name: string;
  price: string;
  per: string;
  blurb: string;
  items: string[];
  cta: string;
  focus?: boolean;
  pressed?: number;
}> = ({ name, price, per, blurb, items, cta, focus, pressed = 0 }) => (
  <div
    style={{
      flex: 1,
      background: '#fff',
      borderRadius: 14,
      border: focus ? `1.5px solid ${snap.ink}` : `1px solid ${snap.line}`,
      padding: '30px 28px',
      position: 'relative',
      boxShadow: focus ? '0 24px 60px rgba(20,20,18,0.12)' : 'none',
    }}
  >
    {focus && (
      <div
        style={{
          position: 'absolute',
          top: -15,
          left: '50%',
          transform: 'translateX(-50%)',
          background: snap.ink,
          color: '#fff',
          fontFamily: fonts.mono,
          fontSize: 13,
          letterSpacing: '0.16em',
          padding: '6px 14px',
          borderRadius: 20,
        }}
      >
        IN FOCUS
      </div>
    )}
    <div style={{ fontFamily: fonts.mono, fontSize: 14, letterSpacing: '0.18em', color: snap.muted }}>{name}</div>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 16 }}>
      <span style={{ fontFamily: fonts.pixel, fontSize: 52, color: snap.ink }}>{price}</span>
      <span style={{ fontFamily: fonts.sans, fontSize: 18, color: snap.muted }}>/ {per}</span>
    </div>
    <div style={{ fontFamily: fonts.sans, fontSize: 17, color: snap.muted, marginTop: 10, lineHeight: 1.5, minHeight: 52 }}>{blurb}</div>
    <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {items.map((it) => (
        <div key={it} style={{ fontFamily: fonts.sans, fontSize: 17, color: snap.ink }}>
          <span style={{ color: snap.muted, marginRight: 10 }}>✓</span>
          {it}
        </div>
      ))}
    </div>
    <Btn
      dark={focus}
      style={{
        marginTop: 30,
        transform: `scale(${1 - pressed * 0.04})`,
        boxShadow: focus ? `0 0 0 ${pressed * 6}px rgba(20,20,18,0.12)` : undefined,
      }}
    >
      {cta}
    </Btn>
  </div>
);

const CreditPack: React.FC<{ qty: number; bump: number; pressPlus: number; pressBuy: number }> = ({ qty, bump, pressPlus, pressBuy }) => (
  <div
    style={{
      flex: 2,
      background: snap.ink,
      borderRadius: 14,
      padding: '30px 30px',
      display: 'flex',
      alignItems: 'center',
      gap: 28,
    }}
  >
    <div style={{ flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ fontFamily: fonts.mono, fontSize: 14, letterSpacing: '0.18em', color: '#a9a8a2' }}>CREDIT PACK</span>
        <span style={{ fontFamily: fonts.mono, fontSize: 12, letterSpacing: '0.14em', color: '#e9e8e3', border: '1px solid #55544f', borderRadius: 12, padding: '3px 10px' }}>
          ONE-TIME
        </span>
      </div>
      <div style={{ fontFamily: fonts.pixel, fontSize: 26, color: '#f4f3ee', marginTop: 16, lineHeight: 1.4 }}>1,000 screenshots. $10. No subscription.</div>
      <div style={{ fontFamily: fonts.sans, fontSize: 16, color: '#a9a8a2', marginTop: 10 }}>Credits never expire and stack on top of any plan.</div>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 18, border: '1px solid #3a3a36', borderRadius: 10, padding: '12px 18px', fontFamily: fonts.mono, fontSize: 18, color: '#e9e8e3' }}>
      <span>−</span>
      <span style={{ display: 'inline-block', minWidth: 74, textAlign: 'center' }}>
        <span style={{ display: 'inline-block', transform: `translateY(${-bump * 6}px)`, color: bump > 0.05 ? '#fff' : '#e9e8e3' }}>{qty}</span> × $10
      </span>
      <span style={{ display: 'inline-block', transform: `scale(${1 + pressPlus * 0.35})`, color: pressPlus > 0.05 ? '#fff' : '#e9e8e3' }}>+</span>
    </div>
    <div
      style={{
        fontFamily: fonts.sans,
        fontWeight: 600,
        fontSize: 18,
        color: snap.ink,
        background: '#f4f3ee',
        borderRadius: 10,
        padding: '14px 22px',
        minWidth: 132,
        textAlign: 'center',
        transform: `scale(${1 - pressBuy * 0.05})`,
      }}
    >
      Buy for ${qty * 10}
    </div>
  </div>
);

export type SiteState = { scroll: number; pressPro?: number; requestPulse?: number; qty?: number; bump?: number; pressPlus?: number; pressBuy?: number };

export const SnapKitSite: React.FC<SiteState> = ({ scroll, pressPro = 0, requestPulse = 0, qty = 1, bump = 0, pressPlus = 0, pressBuy = 0 }) => (
  <div style={{ position: 'absolute', inset: 0, background: snap.paper, overflow: 'hidden' }}>
    <div style={{ transform: `translateY(${-scroll}px)` }}>
      <div
        style={{
          background: snap.ink,
          color: '#e9e8e3',
          fontFamily: fonts.mono,
          fontSize: 15,
          textAlign: 'center',
          padding: '12px 0',
          letterSpacing: '0.02em',
        }}
      >
        <b style={{ color: '#fff' }}>demo_mode</b>&nbsp;&nbsp;SnapKit is a fictional product by <u>Bachs</u>. Every payment runs in sandbox — go ahead, buy things.
      </div>
      <div style={{ width: 1260, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '28px 0' }}>
          <Mark />
          <div style={{ fontFamily: fonts.sans, fontSize: 24, fontWeight: 500, marginLeft: 12, color: snap.ink }}>SnapKit</div>
          <div style={{ display: 'flex', gap: 34, marginLeft: 56, fontFamily: fonts.sans, fontSize: 18, color: snap.muted }}>
            <span>Pricing</span>
            <span>Docs</span>
            <span>Changelog</span>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
            <Btn>Sign in</Btn>
            <Btn dark>Get API key</Btn>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 70, marginTop: 70 }}>
          <div style={{ flex: 1.05 }}>
            <Eyebrow>SCREENSHOT API</Eyebrow>
            <div style={{ fontFamily: fonts.pixel, fontSize: 76, lineHeight: 1.08, color: snap.ink, marginTop: 26 }}>
              Any URL, rendered to pixels. One GET away.
            </div>
            <div style={{ fontFamily: fonts.sans, fontSize: 21, lineHeight: 1.6, color: snap.muted, marginTop: 28, maxWidth: 600 }}>
              Full-page or viewport. Retina, dark mode, ads blocked. Real Chrome renders your target and{' '}
              <code style={{ fontFamily: fonts.mono, background: '#e8e7e1', padding: '2px 8px', borderRadius: 6, color: snap.ink }}>image/png</code> comes
              back in under two seconds.
            </div>
            <div style={{ display: 'flex', gap: 14, marginTop: 34 }}>
              <Btn dark>Get your API key</Btn>
              <Btn>See pricing</Btn>
            </div>
            <div style={{ fontFamily: fonts.mono, fontSize: 16, color: snap.muted, marginTop: 40 }}>
              <span style={{ color: snap.ink }}>● 14,203,588</span> screenshots rendered this week
            </div>
          </div>
          <div style={{ flex: 1, position: 'relative', marginTop: 10 }}>
            <div style={{ background: snap.codeBg, borderRadius: 14, padding: '22px 26px', position: 'relative', zIndex: 2, boxShadow: '0 30px 60px rgba(0,0,0,0.18)' }}>
              <div style={{ fontFamily: fonts.mono, fontSize: 13, color: '#8a8984', textAlign: 'right', letterSpacing: '0.14em' }}>REQUEST</div>
              <div style={{ fontFamily: fonts.mono, fontSize: 17, color: '#d7d6d0', marginTop: 12, lineHeight: 1.6 }}>
                $ curl <span style={{ color: snap.codeGreen }}>"https://api.snapkit.dev/v1/screenshot?url=acme.com&full_page=true"</span>
              </div>
              <div style={{ borderTop: '1px solid #2b2b28', marginTop: 18, paddingTop: 16, fontFamily: fonts.mono, fontSize: 15, color: '#8a8984', display: 'flex', gap: 18 }}>
                <span style={{ color: snap.codeGreen, opacity: 0.6 + requestPulse * 0.4 }}>200 OK</span>
                <span>image/png</span>
                <span>2.0s</span>
              </div>
            </div>
            <div style={{ margin: '-6px 18px 0', background: '#fff', borderRadius: '0 0 14px 14px', border: `1px solid ${snap.line}`, padding: '26px 30px 34px', boxShadow: '0 20px 40px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: '#e5704f' }} />
                {[50, 40, 40].map((w, i) => (
                  <div key={i} style={{ width: w, height: 7, borderRadius: 4, background: '#e6e5e0' }} />
                ))}
                <div style={{ marginLeft: 'auto', width: 76, height: 24, borderRadius: 7, background: snap.ink }} />
              </div>
              <div style={{ marginTop: 30, width: '72%', height: 16, borderRadius: 5, background: snap.ink }} />
              <div style={{ marginTop: 12, width: '48%', height: 16, borderRadius: 5, background: snap.ink }} />
              {[90, 78, 40].map((w, i) => (
                <div key={i} style={{ marginTop: 12, width: `${w}%`, height: 7, borderRadius: 4, background: '#e6e5e0' }} />
              ))}
              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <div style={{ width: 104, height: 30, borderRadius: 7, background: snap.accent }} />
                <div style={{ width: 104, height: 30, borderRadius: 7, background: '#efeee9' }} />
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 160 }}>
          <Eyebrow>PRICING</Eyebrow>
          <div style={{ display: 'flex', gap: 16, marginTop: 34 }}>
            {[
              ['Monthly', 'Annual', '2 months free'],
              ['Overlay', 'Hosted page', 'checkout style'],
            ].map(([a, b, c]) => (
              <div key={a} style={{ display: 'flex', alignItems: 'center', gap: 18, background: '#fff', border: `1px solid ${snap.line}`, borderRadius: 12, padding: 5, paddingRight: 18 }}>
                <div style={{ background: snap.ink, color: '#fff', borderRadius: 8, padding: '10px 18px', fontFamily: fonts.sans, fontWeight: 600, fontSize: 17 }}>{a}</div>
                <div style={{ fontFamily: fonts.sans, fontSize: 17, color: snap.muted }}>{b}</div>
                <div style={{ fontFamily: fonts.mono, fontSize: 14, color: snap.ink }}>{c}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 24, marginTop: 40 }}>
            <Plan
              name="FREE"
              price="$0"
              per="forever"
              blurb="For trying the API and small hobby projects."
              items={['50 screenshots / month', 'Viewport capture, 1× resolution', '1 concurrent render', 'Community support']}
              cta="Get API key"
            />
            <Plan
              focus
              pressed={pressPro}
              name="PRO"
              price="$19"
              per="month"
              blurb="For production apps that screenshot every day."
              items={['5,000 screenshots / month', 'Full-page & element capture', 'Retina 2×, dark mode, ad-block', 'Webhooks on completion']}
              cta="Try Pro free for 14 days"
            />
            <Plan
              name="TEAM"
              price="$39"
              per="month"
              blurb="For teams shipping screenshots across products."
              items={['25,000 screenshots / month', 'Everything in Pro', 'Unlimited seats, shared keys', 'Priority support']}
              cta="Start Team"
            />
          </div>
          <div style={{ display: 'flex', gap: 24, marginTop: 24, paddingBottom: 200 }}>
            <CreditPack qty={qty} bump={bump} pressPlus={pressPlus} pressBuy={pressBuy} />
            <div style={{ flex: 1, border: `1.5px dashed ${snap.line}`, borderRadius: 14, padding: '30px 30px' }}>
              <div style={{ fontFamily: fonts.mono, fontSize: 14, letterSpacing: '0.18em', color: snap.muted }}>ENTERPRISE</div>
              <div style={{ fontFamily: fonts.pixel, fontSize: 26, color: snap.ink, marginTop: 16 }}>Custom volume, custom terms.</div>
              <div style={{ fontFamily: fonts.sans, fontSize: 16, color: snap.muted, marginTop: 10, lineHeight: 1.5 }}>SSO, custom regions, an SLA with teeth.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);
