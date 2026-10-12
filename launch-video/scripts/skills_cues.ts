// Emits every sound-worthy moment of the skills video from the same grid the
// animation uses, so scripts/skills_audio.py places sounds on exact frames.
import { writeFileSync } from 'node:fs';
import beats from '../src/skills/beats.json';
import { at, cue, term, termTimes, TOTAL } from '../src/skills/grid';

const cues: { f: number; kind: string; v?: number; note?: number }[] = [];
const add = (f: number, kind: string, v = 1, note?: number) => cues.push({ f: Math.round(f * 100) / 100, kind, v, note });

const keys = (text: string, times: number[], vol: number) => {
  let last = -9;
  times.forEach((t, i) => {
    if (t - last < 1.2) return; // no machine-gun clicks on fast bursts
    last = t;
    add(t, text[i] === ' ' ? 'space' : 'key', vol);
  });
};
keys(term.claude.text, termTimes.claude, 0.8);
keys(term.market.text, termTimes.market, 0.7);
keys(term.install.text, termTimes.install, 0.7);
keys(term.prompt.text, termTimes.prompt, 0.85);
add(term.marketOk, 'mallet', 0.7, 81); // A5
add(term.installOk, 'mallet', 0.7, 84); // C6, a step up
add(term.enter, 'enter');

add(cue.cardUnfold, 'paper');
add(cue.sweep[0], 'swipe', 1);
[77, 81, 84, 88].forEach((n, i) => add(cue.files[i], 'pop', 0.8, n)); // F5 A5 C6 E6, rising

add(cue.drop, 'drop');
[84, 88, 91].forEach((n, i) => add(cue.tests[i], 'mallet', 0.75, n)); // C6 E6 G6
add(cue.testsDone, 'mallet', 0.6, 89); // F6, home

cue.print.forEach((f, i) => add(f, 'printer', 0.9 - i * 0.04));
add(cue.stamp, 'stamp');

[77, 81, 84, 89].forEach((n, i) => add(cue.names[i], 'pop', 0.85, n)); // F5 A5 C6 F6

writeFileSync(
  new URL('./skills-cues.json', import.meta.url),
  JSON.stringify({ fps: beats.fps, bpm: beats.bpm, offsetSec: beats.offsetSec, total: TOTAL, endBar: beats.endBar, bar1: at(1), cues }, null, 1),
);
console.log(`${cues.length} cues, ${TOTAL} frames`);
