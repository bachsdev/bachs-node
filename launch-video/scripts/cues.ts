// Emits the frame of every sound-worthy event so the audio mix can be
// generated in lockstep with the animation (scripts/make_audio.py).
import { writeFileSync } from 'node:fs';
import { introTyping, routeCode, typeSchedule, typing, type Line } from '../src/code';
import timeline from '../src/timeline.json';

const at = (id: string) => timeline.scenes.find((s) => s.id === id)!.from;
const cues: { f: number; kind: string; v?: number }[] = [];
const add = (f: number, kind: string, v = 1) => cues.push({ f: Math.round(f * 100) / 100, kind, v });

timeline.scenes.slice(1).forEach((s) => add(s.from - 2, 'whoosh', 0.8));

add(at('intro') + 4, 'bloom');
introTyping().events.forEach((e, i, all) => {
  const isLast = i === all.length - 1;
  add(at('intro') + e.f, e.kind === 'back' ? 'back' : 'key', isLast ? 1 : 0.85);
  if (isLast) add(at('intro') + e.f + 2, 'shimmer', 0.8);
});
add(at('snapkit') + 8, 'rise');

const keys = (lines: Line[], start: number, cps: number, seed: string, offset: number, vol: number) => {
  const { times, end } = typeSchedule(lines, start, cps, seed);
  const text = lines.map((l) => l.map(([s]) => s).join('') + '\n').join('');
  let last = -99;
  times.forEach((t, i) => {
    const ch = text[i];
    if (!ch || ch === '\n' || (ch === ' ' && text[i - 1] === ' ')) return;
    if (t - last < 0.5) return; // avoid machine-gun clicks on fast bursts
    last = t;
    add(offset + t, ch === ' ' ? 'space' : 'key', vol);
  });
  return end;
};

const npmEnd = keys([[['npm install @bachs/sdk', '']]], typing.npm.start, typing.npm.cps, typing.npm.seed, at('install'), 1);
add(at('install') + npmEnd + 4, 'enter');
add(at('install') + npmEnd + 10, 'tick', 0.5);
add(at('install') + npmEnd + 18, 'success', 0.7);

const codeEnd = keys(routeCode, typing.route.start, typing.route.cps, typing.route.seed, at('code'), 0.7);
add(at('code') + codeEnd + 8, 'swell');

const beats = timeline.checkout;
beats.plus.forEach((f, i) => add(at('checkout') + f, 'click', 0.55 + i * 0.04));
add(at('checkout') + beats.buy, 'click');
add(at('checkout') + beats.modal, 'pop', 0.8);
add(at('checkout') + beats.pay, 'click');
add(at('checkout') + beats.pay + 12, 'chime');

[0, 80, 160].forEach((d) => add(at('dashboard') + d + 2, 'swoosh', 0.7));
add(at('dashboard') + 110, 'tick', 0.6);
add(at('dashboard') + 222, 'pop', 0.9);
add(at('dashboard') + 232, 'success', 0.6);

[18, 27, 36].forEach((d) => add(at('languages') + d, 'pop', 0.55));

add(at('outro') + 6, 'bloom');
add(at('outro') + 76, 'click');
add(at('outro') + 80, 'tick', 0.6);

writeFileSync(new URL('./cues.json', import.meta.url), JSON.stringify({ fps: timeline.fps, total: timeline.total, scenes: timeline.scenes, cues }, null, 1));
console.log(`${cues.length} cues`);
