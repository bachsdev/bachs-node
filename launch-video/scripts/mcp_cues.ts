// Sound cues for the MCP video, from the same grid the animation uses.
import { writeFileSync } from 'node:fs';
import { keyTimes } from '../src/skills/grid';
import { cue, Q1, Q2, TOTAL, URL_TEXT } from '../src/mcp/grid';

const cues: { f: number; kind: string; v?: number }[] = [];
const add = (f: number, kind: string, v = 1) => cues.push({ f: Math.round(f * 100) / 100, kind, v });
const keys = (text: string, [a, b]: readonly [number, number], seed: string, v: number) => {
  let last = -9;
  keyTimes(text, a, b, seed).forEach((t, i) => {
    if (t - last < 1.3) return;
    last = t;
    add(t, text[i] === ' ' ? 'space' : 'key', v);
  });
};
keys(URL_TEXT, cue.urlType, 'mcp-url', 0.7);
keys(Q1, cue.q1, 'q1', 0.8);
keys(Q2, cue.q2, 'q2', 0.8);
add(cue.allow, 'click');
add(cue.send1, 'enter');
add(cue.send2, 'enter');
add(cue.rowClick, 'click');
[cue.answer1, cue.answer2].forEach((f) => add(f, 'tap', 0.8));
cue.names.forEach((f) => add(f, 'tap', 0.9));
cue.reads.forEach((f) => add(f, 'tap', 0.8));
add(cue.mark, 'thud');

writeFileSync(new URL('./mcp-cues.json', import.meta.url), JSON.stringify({ fps: 30, total: TOTAL, cues }, null, 1));
console.log(`${cues.length} cues`);
