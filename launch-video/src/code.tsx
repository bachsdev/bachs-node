import React from 'react';
import { random } from 'remotion';
import { fonts } from './theme';

// Editor palette tuned to sit next to the Bachs indigo.
export const syn = {
  bg: '#14151f',
  text: '#e6e7f0',
  dim: '#6d7090',
  kw: '#c4a7ff',
  fn: '#8fb4ff',
  str: '#9fe0b0',
  prop: '#f2c98b',
  punc: '#a3a6c2',
};

export type Tok = [string, string];
export type Line = Tok[];

// Precompute when every character lands, with bursty, slightly irregular
// timing: quicker mid-word, a beat at spaces, a longer breath at line ends.
export const typeSchedule = (lines: Line[], start: number, cps: number, seed: string) => {
  const times: number[] = [];
  let t = start;
  let n = 0;
  lines.forEach((line) => {
    const text = line.map(([s]) => s).join('');
    const indent = text.length - text.trimStart().length;
    for (let i = 0; i < text.length; i++) {
      if (i < indent) {
        times.push(t);
        continue;
      }
      const ch = text[i];
      let d = (1 / cps) * (0.55 + random(`${seed}-${n++}`) * 0.9);
      if (ch === ' ') d *= 1.6;
      if ('.({,'.includes(ch)) d *= 1.3;
      t += d;
      times.push(t);
    }
    t += text.trim() === '' ? 2 : 5 + random(`${seed}-eol-${n}`) * 5;
    times.push(t); // newline slot
  });
  return { times, end: t };
};

export const CodeBlock: React.FC<{
  lines: Line[];
  frame: number;
  times: number[];
  fontSize?: number;
  focus?: number[]; // line indexes to keep bright when dimming
  dimT?: number;
  showCaret?: boolean;
  lineNumbers?: boolean;
}> = ({ lines, frame, times, fontSize = 30, focus = [], dimT = 0, showCaret = true, lineNumbers = true }) => {
  // The caret sits on the first line whose newline slot hasn't landed yet.
  let idx = 0;
  let caretLine = -1;
  const rendered = lines.map((line, li) => {
    const lineStart = idx;
    const toks = line.map(([s, color], ti) => {
      let shown = '';
      for (const ch of s) {
        if (frame >= times[idx]) shown += ch;
        idx++;
      }
      return (
        <span key={ti} style={{ color }}>
          {shown}
        </span>
      );
    });
    const eol = times[idx];
    idx++;
    const reached = frame >= (times[lineStart] ?? eol);
    if (caretLine === -1 && frame < eol && reached) caretLine = li;
    const typing = frame < eol && frame - 6 < (times[idx - 2] ?? 0);
    const dimmed = dimT > 0 && !focus.includes(li);
    return (
      <div key={li} style={{ display: 'flex', height: fontSize * 1.55, opacity: dimmed ? 1 - dimT * 0.72 : 1 }}>
        {lineNumbers && (
          <span style={{ width: fontSize * 2.2, color: syn.dim, opacity: reached ? 0.75 : 0.22, textAlign: 'right', marginRight: fontSize * 1.1 }}>
            {li + 1}
          </span>
        )}
        <span style={{ whiteSpace: 'pre' }}>
          {toks}
          {showCaret && caretLine === li && (
            <span
              style={{
                display: 'inline-block',
                width: 3,
                height: fontSize * 1.15,
                background: '#aab4ff',
                verticalAlign: 'middle',
                marginLeft: 1,
                opacity: typing || Math.floor(frame / 15) % 2 === 0 ? 1 : 0.1,
              }}
            />
          )}
        </span>
      </div>
    );
  });
  return <div style={{ fontFamily: fonts.mono, fontSize, color: syn.text }}>{rendered}</div>;
};

// Typing cadence shared by the scenes and the audio cue export.
export const typing = { npm: { start: 18, cps: 0.75, seed: 'npm' }, route: { start: 26, cps: 2.8, seed: 'route' } };

const K = syn.kw, F = syn.fn, S = syn.str, P = syn.prop, U = syn.punc, T = syn.text;

export const routeCode: Line[] = [
  [[`import`, K], [` { `, U], [`Bachs`, T], [` } `, U], [`from`, K], [` '@bachs/sdk'`, S], [`;`, U]],
  [],
  [[`const`, K], [` bachs `, T], [`= `, U], [`new`, K], [` Bachs`, F], [`({`, U]],
  [[`  apiKey`, P], [`: `, U], [`process.env.`, T], [`BACHS_API_KEY`, P], [`,`, U]],
  [[`  environment`, P], [`: `, U], [`'sandbox'`, S], [`,`, U]],
  [[`});`, U]],
  [],
  [[`export async function`, K], [` POST`, F], [`() {`, U]],
  [[`  const`, K], [` checkout `, T], [`= `, U], [`await`, K], [` bachs.`, T], [`checkoutSessions`, P], [`.`, U], [`create`, F], [`({`, U]],
  [[`    product_cart`, P], [`: [{ `, U], [`product_id`, P], [`: `, U], [`'prod_credit_pack'`, S], [`, `, U], [`quantity`, P], [`: `, U], [`7`, F], [` }],`, U]],
  [[`    success_url`, P], [`: `, U], [`'https://snapkit.bachs.io/welcome'`, S], [`,`, U]],
  [[`  });`, U]],
  [],
  [[`  return`, K], [` Response.`, T], [`json`, F], [`({ `, U], [`url`, P], [`: `, U], [`checkout.`, T], [`checkout_url`, P], [` });`, U]],
  [[`}`, U]],
];
