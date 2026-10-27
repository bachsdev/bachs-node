import React from 'react';
import { AbsoluteFill, Audio, Easing, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { fontFaceCss, fonts } from '../theme';
import edit from './edit.json';

// Bachs CLI, "Test webhooks on your machine". The real loop in one take: forward
// sandbox events to localhost, send yourself one, see what the handler returned,
// fix the handler, replay the same event. Every command and reply is from the
// local testing guide on docs.bachs.io; the handler is our own example.

export const CLI_WEBHOOKS_TOTAL = edit.total;

const c = {
  ground: '#12142a',
  pane: '#1a1d38',
  bar: '#20243f',
  line: 'rgba(255,255,255,0.08)',
  text: '#e9ecf7',
  dim: 'rgba(233,236,247,0.5)',
  faint: 'rgba(233,236,247,0.3)',
  sky: '#a9c6ff',
  cobalt: '#3672ea',
  green: '#6fdc8c',
  red: '#ff7a6e',
  string: '#f2c88f',
};

const IO = Easing.bezier(0.4, 0, 0.2, 1);
const OUT = Easing.bezier(0.05, 0.7, 0.1, 1);
const k = (f: number, a: number, z: number, easing = IO) => interpolate(f, [a, z], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing });

type Typed = { pane: string; text: string; keys: number[] };
const TYPED = edit.typing as Typed[];
const [D1, D2, D3] = edit.deliveries;
const MONO = 21;
const LH = 34;

const typedCount = (keys: number[], f: number) => keys.filter((t) => f >= t).length;
const Caret: React.FC<{ on: boolean }> = ({ on }) => {
  const f = useCurrentFrame();
  return on ? <span style={{ display: 'inline-block', width: MONO * 0.6, height: MONO * 1.15, verticalAlign: '-4px', background: c.sky, opacity: f % 18 < 11 ? 0.9 : 0.15 }} /> : null;
};

// ---------- panes ----------

const Pane: React.FC<{ title: string; x: number; y: number; w: number; h: number; children: React.ReactNode; dim?: number }> = ({ title, x, y, w, h, children }) => {
  const f = useCurrentFrame();
  const t = k(f, 0, 20, OUT);
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, background: c.pane, border: `1px solid ${c.line}`, borderRadius: 14, overflow: 'hidden', opacity: t, transform: `translateY(${(1 - t) * 16}px)` }}>
      <div style={{ height: 44, display: 'flex', alignItems: 'center', padding: '0 20px', background: c.bar, borderBottom: `1px solid ${c.line}`, fontFamily: fonts.mono, fontSize: 15, color: c.dim }}>{title}</div>
      <div style={{ padding: '18px 24px', fontFamily: fonts.mono, fontSize: MONO, lineHeight: `${LH}px`, color: c.text, whiteSpace: 'pre' }}>{children}</div>
    </div>
  );
};

const Prompt: React.FC = () => <span style={{ color: c.sky }}>~/tolus-ovens $ </span>;

// A command typed at the prompt, from the edit's keystroke frames.
const Command: React.FC<{ ty: Typed; last: boolean }> = ({ ty, last }) => {
  const f = useCurrentFrame();
  const n = typedCount(ty.keys, f);
  if (f < ty.keys[0] - 14) return null;
  return (
    <div>
      <Prompt />
      {ty.text.slice(0, n)}
      <Caret on={last && n < ty.text.length + 1 && f < ty.keys[ty.keys.length - 1] + 8} />
    </div>
  );
};

const Out: React.FC<{ at: number; children: React.ReactNode; color?: string }> = ({ at, children, color }) => {
  const f = useCurrentFrame();
  if (f < at) return null;
  return <div style={{ color: color ?? c.dim, opacity: k(f, at, at + 4) }}>{children}</div>;
};

const Delivery: React.FC<{ at: number; ok: boolean; type: string; id: string; status: number; ms: number }> = ({ at, ok, type, id, status, ms }) => {
  const f = useCurrentFrame();
  if (f < at) return null;
  const flash = 1 - k(f, at, at + 40);
  return (
    <div style={{ opacity: k(f, at, at + 4), background: `rgba(${ok ? '111,220,140' : '255,122,110'},${0.12 * flash})`, margin: '0 -24px', padding: '0 24px' }}>
      <span style={{ color: ok ? c.green : c.red }}>{ok ? '✓' : '✗'}</span> {type.padEnd(22)}
      <span style={{ color: c.dim }}>{id}</span> <span style={{ color: ok ? c.green : c.red }}>{status}</span> <span style={{ color: c.dim }}>[{ms}ms]</span>
    </div>
  );
};

const Listen: React.FC = () => {
  const f = useCurrentFrame();
  const r = edit.ready;
  const ty = TYPED.find((t) => t.pane === 'listen')!;
  return (
    <Pane title="listen" x={80} y={120} w={940} h={500}>
      <Command ty={ty} last={f < r} />
      <Out at={r} color={c.text}>Ready! Forwarding sandbox events to http://localhost:3000/webhooks</Out>
      <Out at={r + 5}>Your webhook signing secret is whsec_•••••••• (^C to quit)</Out>
      <Out at={r + 10}>Session whls_8f2e… · 26 event type(s)</Out>
      <div style={{ height: LH * 0.6 }} />
      <Delivery at={D1} ok type="collection.succeeded" id="evt_3ab4e0d5" status={200} ms={42} />
      <Delivery at={D2} ok={false} type="refund.paid" id="evt_7c1f22a9" status={500} ms={131} />
      <Delivery at={D3} ok type="refund.paid" id="evt_7c1f22a9" status={200} ms={38} />
      <Out at={edit.ctrlc} color={c.sky}>^C</Out>
    </Pane>
  );
};

const Trigger: React.FC = () => {
  const f = useCurrentFrame();
  const cmds = TYPED.filter((t) => t.pane === 'trigger');
  // the pane shows the latest two commands, like a terminal after a few runs
  const active = cmds.filter((t) => f >= t.keys[0] - 14);
  const shown = active.slice(-2);
  return (
    <Pane title="trigger" x={80} y={650} w={940} h={250}>
      {active.length === 0 && (
        <div>
          <Prompt />
          <Caret on={f > 120} />
        </div>
      )}
      {shown.map((t, i) => (
        <Command key={t.text} ty={t} last={i === shown.length - 1} />
      ))}
    </Pane>
  );
};

// ---------- the handler ----------

type Seg = [string, string?];
const tokenize = (src: string): Seg[] => {
  const out: Seg[] = [];
  const re = /('[^']*'|`[^`]*`)|\b(import|from|const|async|await|return|if|switch|case|break|default|throw|new)\b|(\/\/.*$)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    if (m.index > last) out.push([src.slice(last, m.index)]);
    out.push([m[0], m[1] ? c.string : m[2] ? c.sky : c.faint]);
    last = m.index + m[0].length;
  }
  if (last < src.length) out.push([src.slice(last)]);
  return out;
};
const Code: React.FC<{ src: string }> = ({ src }) => (
  <>
    {tokenize(src).map(([t, col], i) => (
      <span key={i} style={{ color: col }}>{t}</span>
    ))}
  </>
);

const BEFORE = [
  "import express from 'express';",
  "import { verify } from './verify.js';",
  '',
  'const app = express();',
  'const secret = process.env.BACHS_WEBHOOK_SECRET;',
  "const raw = express.raw({ type: 'application/json' });",
  '',
  "app.post('/webhooks', raw, async (req, res) => {",
  "  const signature = req.get('X-Bachs-Signature-V2');",
  '  if (!verify(signature, req.body, secret)) {',
  '    return res.sendStatus(400);',
  '  }',
  '',
  '  const event = JSON.parse(req.body);',
  '  switch (event.type) {',
  "    case 'collection.succeeded':",
  '      await fulfilOrder(event);',
  '      break;',
  '    default:',
  '      throw new Error(`Unhandled event: ${event.type}`);',
  '  }',
  '  res.sendStatus(200);',
  '});',
];
const INSERT_AT = 18; // after "break;" (0-based index of "default:")
const FIX = edit.code as { text: string; keys: number[] }[];
const CLH = 29;

const Handler: React.FC = () => {
  const f = useCurrentFrame();
  const t = k(f, 0, 20, OUT);
  // Each inserted line opens its space as it starts being typed.
  const open = FIX.map((l) => k(f, l.keys[0] - 8, l.keys[0], OUT));
  const rows: { y: number; num: number; el: React.ReactNode; hl?: string }[] = [];
  let y = 0;
  let num = 1;
  const hl = (lines: number[], at: number, until: number, color: string) => (i: number) => (lines.includes(i) && f >= at && f < until ? color : undefined);
  const hit1 = hl([15, 16, 17], D1, D1 + 70, 'rgba(54,114,234,0.22)');
  const hit2 = hl([18, 19], D2, edit.codeFrom - 6, 'rgba(255,122,110,0.16)');
  BEFORE.forEach((src, i) => {
    if (i === INSERT_AT) {
      FIX.forEach((l, j) => {
        if (open[j] <= 0) return;
        const n = typedCount(l.keys, f);
        const indent = l.text.length - l.text.trimStart().length;
        const typing = n < l.keys.length && f >= l.keys[0];
        const lit = f >= D3 && f < D3 + 60 ? 'rgba(111,220,140,0.16)' : undefined;
        rows.push({
          y,
          num: num++,
          hl: lit,
          el: (
            <span style={{ opacity: open[j] }}>
              <Code src={l.text.slice(0, indent + n)} />
              {typing && <Caret on />}
            </span>
          ),
        });
        y += CLH * open[j];
      });
    }
    const color = hit1(i) ?? hit2(i);
    const failTag = i === 19 && f >= D2 && f < edit.codeFrom - 6;
    rows.push({
      y,
      num: num++,
      hl: color,
      el: (
        <>
          <Code src={src} />
          {failTag && <span style={{ marginLeft: 16, padding: '1px 8px', borderRadius: 6, background: 'rgba(255,122,110,0.2)', color: c.red, fontSize: 15, opacity: k(f, D2, D2 + 6) }}>500</span>}
        </>
      ),
    });
    y += CLH;
  });
  return (
    <div style={{ position: 'absolute', left: 1060, top: 120, width: 780, height: 780, background: c.pane, border: `1px solid ${c.line}`, borderRadius: 14, overflow: 'hidden', opacity: t, transform: `translateY(${(1 - t) * 16}px)` }}>
      <div style={{ height: 44, display: 'flex', alignItems: 'center', padding: '0 20px', background: c.bar, borderBottom: `1px solid ${c.line}`, fontFamily: fonts.mono, fontSize: 15, color: c.dim }}>webhooks.js</div>
      <div style={{ position: 'relative', margin: '14px 0', fontFamily: fonts.mono, fontSize: 18, lineHeight: `${CLH}px`, whiteSpace: 'pre', color: c.text }}>
        {rows.map((r, i) => (
          <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: r.y, height: CLH, display: 'flex', background: r.hl }}>
            <span style={{ width: 52, textAlign: 'right', paddingRight: 18, color: c.faint }}>{r.num}</span>
            <span>{r.el}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ---------- the camera ----------

// One continuous camera: it eases in on whatever is being typed and back out when a
// delivery lands, so the result and the handler line it ran are in frame together.
// [frame, x, y, scale]: the point (x, y) is held at the centre of the frame.
const CAMERA: [number, number, number, number][] = [
  [0, 960, 540, 1],
  [22, 960, 540, 1],
  [52, 560, 300, 1.4],
  [125, 560, 300, 1.4],
  [158, 960, 540, 1],
  [248, 960, 540, 1],
  [272, 560, 640, 1.25],
  [292, 560, 640, 1.25],
  [314, 960, 470, 1.1],
  [488, 960, 470, 1.1],
  [510, 560, 640, 1.25],
  [524, 560, 640, 1.25],
  [546, 960, 470, 1.1],
  [640, 960, 470, 1.1],
  [670, 1450, 700, 1.3],
  [850, 1450, 700, 1.3],
  [874, 560, 640, 1.25],
  [908, 560, 640, 1.25],
  [930, 960, 470, 1.1],
];
const camAt = (f: number) => {
  let i = 0;
  while (i < CAMERA.length - 1 && f >= CAMERA[i + 1][0]) i++;
  const a = CAMERA[i];
  const b = CAMERA[Math.min(i + 1, CAMERA.length - 1)];
  const t = b[0] === a[0] ? 1 : k(f, a[0], b[0]);
  const [x, y, sc] = [a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] + (b[3] - a[3]) * t];
  return `translate(${960 - x * sc}px, ${540 - y * sc}px) scale(${sc})`;
};

// ---------- captions and end card ----------

const Captions: React.FC = () => {
  const f = useCurrentFrame();
  const caps = edit.captions;
  return (
    <>
      {caps.map((cap, i) => {
        const next = caps[i + 1]?.at ?? edit.endAt - 20;
        const o = k(f, cap.at, cap.at + 12, OUT) * (1 - k(f, next - 10, next));
        if (o <= 0) return null;
        return (
          <div key={i} style={{ position: 'absolute', left: 80, top: 950, fontFamily: fonts.sans, fontSize: 36, letterSpacing: '-0.015em', color: c.text, opacity: o, transform: `translateY(${(1 - k(f, cap.at, cap.at + 12, OUT)) * 10}px)` }}>
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
  const out = k(f, edit.total - 24, edit.total);
  const n = typedCount(edit.install.keys, f);
  const rise = (d: number) => ({ opacity: k(f, a + d, a + d + 14, OUT), transform: `translateY(${(1 - k(f, a + d, a + d + 14, OUT)) * 14}px)` });
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', color: c.text, fontFamily: fonts.sans, opacity: 1 - out }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 32, opacity: t, transform: `scale(${0.92 + 0.08 * t})` }}>
        <Img src={staticFile('brand/logo-white.png')} style={{ height: 70 }} />
        <span style={{ fontSize: 96, fontWeight: 500, letterSpacing: '-0.03em', color: c.sky }}>CLI</span>
      </div>
      <div style={{ marginTop: 44, fontSize: 56, fontWeight: 500, letterSpacing: '-0.03em', ...rise(14) }}>Test webhooks on your machine.</div>
      <div style={{ marginTop: 34, padding: '16px 26px', borderRadius: 12, background: c.pane, border: `1px solid ${c.line}`, fontFamily: fonts.mono, fontSize: 30, ...rise(26) }}>
        <span style={{ color: c.sky }}>$ </span>
        {edit.install.text.slice(0, n)}
        <Caret on={n < edit.install.text.length || f % 36 < 26} />
      </div>
      <div style={{ marginTop: 26, fontSize: 24, color: c.dim, ...rise(60) }}>docs.bachs.io/developer-portal/local-testing</div>
    </AbsoluteFill>
  );
};

export const CliWebhooks: React.FC = () => {
  const f = useCurrentFrame();
  const leave = k(f, edit.endAt - 22, edit.endAt + 2);
  return (
    <AbsoluteFill style={{ background: c.ground, overflow: 'hidden' }}>
      <style>{fontFaceCss}</style>
      <AbsoluteFill style={{ opacity: 1 - leave, transform: `scale(${1 - 0.03 * leave})`, filter: leave > 0 ? `blur(${leave * 5}px)` : undefined }}>
        <AbsoluteFill style={{ transformOrigin: '0 0', transform: camAt(f) }}>
          <Img src={staticFile('brand/logo-white.png')} style={{ position: 'absolute', left: 84, top: 52, height: 30, opacity: k(f, 0, 20) }} />
          <div style={{ position: 'absolute', right: 80, top: 50, fontFamily: fonts.mono, fontSize: 20, color: c.dim, opacity: k(f, 0, 20) }}>sandbox</div>
          <Listen />
          <Trigger />
          <Handler />
        </AbsoluteFill>
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 210, background: `linear-gradient(rgba(18,20,42,0), ${c.ground} 55%)` }} />
        <Captions />
      </AbsoluteFill>
      <EndCard />
      <Audio src={staticFile('audio/cliwebhooks-mix.wav')} />
    </AbsoluteFill>
  );
};
