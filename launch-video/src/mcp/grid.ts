import beats from './beats.json';

// Musical grid for the MCP video, fitted to public/audio/mcp-music.wav.
export const FPS = beats.fps;
export const BEAT = (60 / beats.bpm) * FPS;
const OFFSET = beats.offsetSec * FPS;

/** Frame of a [bar, beat] position (1-based; fractional beats allowed). */
export const at = (bar: number, beat = 1) => Math.round(OFFSET + ((bar - 1) * 4 + (beat - 1)) * BEAT);
export const TOTAL = Math.round(beats.endSec * FPS);

export const URL_TEXT = 'https://mcp.bachs.io/mcp';
export const Q1 = 'Which subscriptions are past due?';
export const Q2: string = "What's my balance in each currency?";

export const cue = {
  hook: at(1),
  connector: at(2, 1),
  urlType: [at(2, 1) + 4, at(2, 2) + 12] as const,
  consent: at(2, 3),
  allow: at(3, 1),
  q1: [at(3, 2) + 6, at(4, 1) - 4] as const,
  send1: at(4, 1) - 2,
  chip1: at(4, 1),
  back1: at(4, 2),
  answer1: at(4, 3),
  switch: at(5, 1),
  chatgpt: at(6, 1),
  q2: [at(6, 2) + 4, at(7, 1) - 4] as const,
  send2: at(7, 1) - 2,
  chip2: at(7, 1),
  back2: at(7, 2),
  answer2: at(7, 3),
  apps: at(9, 1),
  rowClick: at(9, 3),
  drawer: at(9, 3) + 2,
  hover: at(10, 1),
  names: [at(11, 1), at(11, 2), at(11, 3), at(11, 4)],
  anyClient: at(12, 1),
  reads: [at(13, 1), at(13, 2), at(13, 3)],
  end: at(14, 1),
  urlPill: at(14, 3),
  portal: at(15, 1),
  mark: at(16, 1),
};
