import { random } from 'remotion';
import beats from './beats.json';

// Musical grid for the skills video. Every cue is a [bar, beat] position;
// change bpm / offsetSec in beats.json to fit a licensed track.
export const FPS = beats.fps;
export const BEAT = (60 / beats.bpm) * FPS; // frames per beat
export const BAR = BEAT * 4;
const OFFSET = beats.offsetSec * FPS;

/** Frame of a [bar, beat] position (1-based; fractional beats allowed). */
export const at = (bar: number, beat = 1) => Math.round(OFFSET + ((bar - 1) * 4 + (beat - 1)) * BEAT);

export const TOTAL = at(beats.endBar) + 45; // ring-out after the last bar

/**
 * Keystroke times for `text`, spread between `start` and `end` with a human,
 * slightly uneven cadence (quicker inside words, a beat at spaces).
 */
export const keyTimes = (text: string, start: number, end: number, seed: string) => {
  const raw: number[] = [];
  let t = 0;
  for (let i = 0; i < text.length; i++) {
    let d = 0.6 + random(`${seed}-${i}`) * 0.8;
    if (text[i] === ' ') d *= 1.7;
    if ('/@.-'.includes(text[i])) d *= 1.25;
    t += d;
    raw.push(t);
  }
  const scale = (end - start) / t;
  return raw.map((r) => start + r * scale);
};

export const typed = (text: string, times: number[], frame: number) => text.slice(0, times.filter((t) => frame >= t).length);

// The terminal lines and when each is typed.
export const term = {
  claude: { text: 'claude', start: at(1, 3), end: at(1, 4) },
  market: { text: '/plugin marketplace add bachsdev/bachs-skills', start: at(3, 1) + 4, end: at(3, 4) + 10 },
  marketOk: at(4, 1),
  install: { text: '/plugin install bachs@bachs', start: at(4, 2), end: at(4, 3) + 10 },
  installOk: at(4, 4),
  prompt: { text: 'Add subscriptions to this app.', start: at(5, 1) + 2, end: at(5, 4) },
  enter: at(6, 1),
};
export const termTimes = {
  claude: keyTimes(term.claude.text, term.claude.start, term.claude.end, 'claude'),
  market: keyTimes(term.market.text, term.market.start, term.market.end, 'market'),
  install: keyTimes(term.install.text, term.install.start, term.install.end, 'install'),
  prompt: keyTimes(term.prompt.text, term.prompt.start, term.prompt.end, 'prompt'),
};

export const cue = {
  cardUnfold: at(6, 1),
  tabSelect: at(6, 3),
  sweep: [at(7, 1), at(7, 3)] as const,
  link: [at(7, 3), at(8, 1)] as const,
  files: [at(8, 1), at(8, 3), at(9, 1), at(9, 3)],
  rulePush: at(10, 1),
  ruleSub: at(11, 1),
  stop: at(11, 4),
  drop: at(12, 1),
  tests: [at(12, 3), at(13, 1), at(13, 3)],
  testsDone: at(13, 4),
  review: at(14, 1),
  print: [at(14, 1), at(14, 3), at(15, 1), at(15, 3), at(16, 1), at(16, 2)],
  stamp: at(16, 3),
  everywhere: at(17, 1),
  names: [at(17, 1), at(17, 2), at(17, 3), at(17, 4)],
  anyChat: at(18, 1),
  outro: at(19, 1),
  docs: at(19, 3),
  final: at(20, 1),
};
