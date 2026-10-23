// The edit as data. A chapter is a list of beats; a beat is either a slice of
// a recorded take or a graphic card, with the line of narration said over it.
// A beat lasts as long as its slice or its narration, whichever is longer, and
// holds the slice's last frame while the narration finishes. Recutting to the
// recorded voice means changing beat lengths, nothing else.

export const FPS = 30;

export type Ev = { name: string; t: number; [k: string]: unknown };
export type TakeData = {
  chapter: string;
  duration: number;
  windows: string[];
  events: Ev[];
  masks: { t: number; rects: number[][] }[];
};

// A moment in a take: seconds, an event name (first occurrence), or an event
// picked by name and line number or occurrence, with an offset in seconds.
export type Ref = number | string | { ev: string; n?: number; nth?: number; off?: number; last?: boolean };

export type Highlight = { at: string; from: number; to: number };

export type Card =
  | { kind: 'title' }
  | { kind: 'chapter'; n: string; title: string }
  | { kind: 'checklist'; show: number }
  | { kind: 'statement'; text: string }
  | { kind: 'end' };

export type TakeSlice = { take: string; win: 'editor' | 'browser'; from: Ref; to: Ref; speed?: number; hl?: Highlight };

export type Beat = {
  say?: string;
  step?: string; // numbered step caption; carries on until a beat sets another (or '')
  min?: number;
} & (TakeSlice | { card: Card });

export type Chapter = { id: string; beats: Beat[] };

export const resolve = (take: TakeData, ref: Ref): number => {
  if (typeof ref === 'number') return ref;
  const r = typeof ref === 'string' ? { ev: ref } : ref;
  const hits = take.events.filter((e) => e.name === r.ev && (r.n === undefined || e.n === r.n));
  const e = r.last ? hits.at(-1) : hits[r.nth ?? 0];
  if (!e) throw new Error(`take ${take.chapter} has no event ${JSON.stringify(ref)}`);
  return Math.max(0, Math.min(take.duration, e.t + (r.off ?? 0)));
};

// Narration at a calm reading pace, with a breath at the end.
export const readTime = (text = '') => (text ? text.split(/\s+/).length / 2.6 + 0.7 : 0);

export type Placed = Beat & { start: number; frames: number; segFrames: number; src0: number; src1: number; stepNo: string };
export type PlacedTake = Placed & TakeSlice;

export const place = (chapters: Chapter[], takes: Record<string, TakeData>) => {
  const out: Placed[] = [];
  let start = 0;
  let step = '';
  let stepCount = 0;
  for (const ch of chapters) {
    for (const b of ch.beats) {
      if (b.step !== undefined && b.step !== step) {
        step = b.step;
        if (step) stepCount++;
      }
      let src0 = 0;
      let src1 = 0;
      let seg = 0;
      if ('take' in b) {
        const take = takes[b.take];
        if (!take) throw new Error(`missing take ${b.take}`);
        src0 = resolve(take, b.from);
        src1 = resolve(take, b.to);
        seg = Math.max(0, src1 - src0) / (b.speed ?? 1);
      }
      const secs = Math.max(seg, readTime(b.say), b.min ?? 0, 'card' in b ? 2.2 : 0.4);
      const frames = Math.round(secs * FPS);
      out.push({ ...b, start, frames, segFrames: Math.max(1, Math.round(seg * FPS)), src0, src1, step, stepNo: step ? String(stepCount) : '' });
      start += frames;
    }
  }
  return { beats: out, total: start };
};

// The source time a placed beat shows at a frame inside it.
export const srcTime = (b: Placed, local: number) => {
  if (!('take' in b)) return 0;
  const s = Math.min(local, b.segFrames) / FPS;
  return Math.min(b.src1, b.src0 + s * (b.speed ?? 1));
};
