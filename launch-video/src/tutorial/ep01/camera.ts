import type { Ev, TakeData } from './timeline';

// Camera moves in a take's own time: from `at`, ease over `dur` seconds to
// zoom `z` centred on (x, y) in the recorded window's 1920x1080 layout.
export type Move = { at: number; dur: number; z: number; x: number; y: number };
export type View = { z: number; x: number; y: number };

const WIDE: View = { z: 1, x: 960, y: 540 };
const inOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export const viewAt = (moves: Move[], t: number): View => {
  let v: View = WIDE;
  for (const m of moves) {
    if (t <= m.at) break;
    const k = m.dur > 0 ? inOut(Math.min(1, (t - m.at) / m.dur)) : 1;
    v = { z: v.z + (m.z - v.z) * k, x: v.x + (m.x - v.x) * k, y: v.y + (m.y - v.y) * k };
  }
  return v;
};

const num = (e: Ev, k: string) => (typeof e[k] === 'number' ? (e[k] as number) : undefined);

// Code: a zoom that fits the longest line (about 100 columns at 17px), with
// the left edge of the code in view, following the line being typed.
const CODE_Z = 1.8;
const codeLeft = (events: Ev[]) => {
  const xs = events.filter((e) => e.name === 'line').map((e) => num(e, 'x')!).filter(Boolean);
  return xs.length ? Math.min(...xs) : 340;
};
// The gutter (line numbers) sits about 90px left of the code.
const codeView = (left: number, y: number): View => ({ z: CODE_Z, x: left - 92 + 1920 / CODE_Z / 2, y });

// Terminal: the whole panel at 2.2x, from the left of the pane that has the prompt.
const TERM_Z = 2.2;
const termView = (e: Ev): View => {
  const x = num(e, 'x') ?? 320;
  return { z: TERM_Z, x: x - 24 + 1920 / TERM_Z / 2, y: 1080 - 1080 / TERM_Z / 2 };
};

const TERMINAL_EVENTS = new Set([
  'terminal', 'install', 'installed', 'key', 'key-set', 'run', 'product-id', 'paste-id', 'server-ready',
  'cli-terminal', 'listen', 'listen-ready', 'server-terminal', 'secret', 'restart',
]);

// Both terminal panes, side by side, for the moment the payment lands.
const PANES: View = { z: 1.17, x: 1110, y: 1080 - 1080 / 1.17 / 2 };

export const editorMoves = (take: TakeData): Move[] => {
  const left = codeLeft(take.events);
  const moves: Move[] = [];
  for (const e of take.events) {
    if (e.name === 'line' && num(e, 'y') !== undefined) {
      moves.push({ at: e.t - 0.15, dur: 0.5, ...codeView(left, num(e, 'y')!) });
    } else if (e.name === 'import' && num(e, 'y') !== undefined) {
      moves.push({ at: e.t - 0.6, dur: 0.7, ...codeView(left, num(e, 'y')!) });
    } else if (e.name === 'type-end') {
      moves.push({ at: e.t + 0.6, dur: 0.9, ...WIDE });
    } else if (e.name === 'order-paid' && num(e, 'x') !== undefined) {
      // The server's line first, then both panes: the CLI's delivery beside it.
      moves.push({ at: e.t - 0.6, dur: 0.6, ...termView(e) });
      moves.push({ at: e.t + 3.0, dur: 1.0, ...PANES });
    } else if (TERMINAL_EVENTS.has(e.name) && num(e, 'x') !== undefined) {
      // Hold on output a moment before following the prompt to another pane.
      const prev = moves.at(-1);
      const v = termView(e);
      if (!prev || Math.abs(prev.x - v.x) > 1 || prev.z !== v.z) moves.push({ at: e.t - 0.5, dur: 0.7, ...v });
    }
  }
  return moves;
};

// Browser: wide on arrival, then push in on whatever is being clicked or typed.
export const browserMoves = (take: TakeData): Move[] => {
  const moves: Move[] = [];
  let onStore = false;
  for (const e of take.events) {
    if (e.name === 'url') onStore = String(e.url).startsWith('http://localhost');
    if (e.name === 'site' || e.name === 'checkout' || e.name === 'url') {
      moves.push({ at: e.t - 0.2, dur: 0.8, ...WIDE });
    } else if (e.name === 'paid') {
      // The receipt card, centred on the success page.
      moves.push({ at: e.t - 0.2, dur: 0.9, z: 1.35, x: 960, y: 430 });
    } else if (e.name === 'click' && onStore) {
      // The store is one product: a gentle push keeps all of it in frame.
      moves.push({ at: e.t - 1.2, dur: 1.0, z: 1.08, x: 960, y: 545 });
    } else if (e.name === 'click') {
      const x = num(e, 'x')!;
      const y = num(e, 'y')!;
      moves.push({ at: e.t - 0.9, dur: 0.7, z: 1.55, x, y });
    }
  }
  return moves;
};

// The recap holds still on a file; each beat frames its highlighted block.
export const recapMoves = (): Move[] => [{ at: 0, dur: 0, z: 1.25, x: 1040, y: 470 }];

export const blockView = (lines: Record<string, [number, number]>, left: number, from: number, to: number): View | null => {
  const a = lines[String(from)];
  const b = lines[String(to)];
  if (!a || !b) return null;
  const top = a[0];
  const bottom = b[0] + b[1];
  const z = Math.max(1, Math.min(1.7, 860 / (bottom - top + 160)));
  return { z, x: left - 92 + 1920 / z / 2, y: (top + bottom) / 2 };
};
