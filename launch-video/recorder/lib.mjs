// Shared pieces for scripted recordings: two 1920x1080 windows painted at 2x
// (VS Code in code-server, and a plain browser), each captured as timestamped
// 4K screencast frames, plus an event log the edit uses for camera moves.
//
// The session runs SLOW times slower than real life (software rendering only
// paints about 6 frames a second at 4K) and assemble.py plays it back at
// normal speed from the paint timestamps.
import { chromium } from 'playwright-core';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';

export const SLOW = Number(process.env.SLOW ?? 3);
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms * SLOW)); // playback ms
export const realSleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const rand = (a, b) => a + Math.random() * (b - a);

// Secrets never reach a painted frame: this runs in the editor page and covers
// the secret part of any sk_sandbox_/whsec_ token in a terminal with an opaque
// box, from a MutationObserver, so the box lands before the text is painted.
// The edit draws its own styled mask from the same rectangles (masks.json).
const SECRET_GUARD = () => {
  if (!document.documentElement) return void document.addEventListener('readystatechange', SECRET_GUARD_START, { once: true });
  SECRET_GUARD_START();
  function SECRET_GUARD_START() {
  const PREFIX = /(sk_sandbox_|sk_live_|whsec_)([A-Za-z0-9_]+)/g;
  const layer = document.createElement('div');
  layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483647';
  document.documentElement.appendChild(layer);
  window.__maskLog = [];
  let last = '';
  const textNodes = (el) => {
    const out = [];
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) out.push(w.currentNode);
    return out;
  };
  // Join a terminal's rows so a line wrapped onto the next row reads as one
  // line: a row whose last glyph reaches the right edge runs on unbroken.
  function joinRows(rowsEl) {
    const nodes = [];
    let text = '';
    const edge = rowsEl.getBoundingClientRect().right;
    for (const row of rowsEl.children) {
      let lastRight = 0;
      let cell = 10;
      for (const n of textNodes(row)) {
        nodes.push({ n, start: text.length });
        text += n.data;
        const visible = n.data.replace(/[\s\u00a0]+$/, '').length;
        if (visible) {
          const r = document.createRange();
          r.setStart(n, visible - 1);
          r.setEnd(n, visible);
          const b = r.getBoundingClientRect();
          if (b.width) [lastRight, cell] = [b.right, b.width];
        }
      }
      if (lastRight < edge - 1.5 * cell) text += '\n';
    }
    return { text, nodes };
  }
  window.__terminalText = () => [...document.querySelectorAll('.xterm-rows')].map((el) => joinRows(el).text.replace(/\u00a0/g, ' '));
  const scan = () => {
    const rects = [];
    for (const rowsEl of document.querySelectorAll('.xterm-rows')) {
      const { text, nodes } = joinRows(rowsEl);
      // Secret spans: anything after a known prefix, plus any run of 5+
      // characters that is part of a secret the recorder has handed us, so a
      // fragment is covered even if a redraw separates it from its prefix.
      const spans = [...text.matchAll(PREFIX)].map((m) => [m.index + m[1].length, m.index + m[0].length]);
      const grams = window.__secretGrams;
      if (grams?.size) {
        for (let i = 0; i + 5 <= text.length; i++) if (grams.has(text.slice(i, i + 5))) spans.push([i, i + 5]);
      }
      spans.sort((x, y) => x[0] - y[0]);
      const merged = [];
      for (const sp of spans) {
        const top = merged.at(-1);
        if (top && sp[0] <= top[1]) top[1] = Math.max(top[1], sp[1]);
        else merged.push([...sp]);
      }
      for (const [a, b] of merged) {
        for (const { n, start } of nodes) {
          const s = Math.max(a, start);
          const e = Math.min(b, start + n.data.length);
          if (s >= e) continue;
          const r = document.createRange();
          r.setStart(n, s - start);
          r.setEnd(n, e - start);
          for (const c of r.getClientRects()) rects.push([c.left, c.top, c.width, c.height].map((v) => Math.round(v * 10) / 10));
        }
      }
    }
    const key = JSON.stringify(rects);
    if (key === last) return;
    last = key;
    // The terminal's own colour, from the first ancestor that paints one.
    let bg = '#f8f8f8';
    for (let el = document.querySelector('.xterm-rows'); el; el = el.parentElement) {
      const c = getComputedStyle(el).backgroundColor;
      if (c && c !== 'transparent' && !/rgba\(.*,\s*0\)$/.test(c)) { bg = c; break; }
    }
    layer.replaceChildren(
      ...rects.map(([x, y, w, h]) => {
        const d = document.createElement('div');
        d.style.cssText = `position:absolute;left:${x - 1}px;top:${y}px;width:${w + 2}px;height:${h}px;background:${bg}`;
        return d;
      }),
    );
    window.__maskLog.push({ wall: Date.now() / 1000, rects });
  };
  const watched = new WeakSet();
  const attach = () => {
    for (const el of document.querySelectorAll('.xterm-rows')) {
      if (watched.has(el)) continue;
      watched.add(el);
      new MutationObserver(scan).observe(el, { childList: true, subtree: true, characterData: true });
    }
    scan();
  };
  setInterval(attach, 50);
  window.addEventListener('resize', scan);
  }
};

// Tell the in-page guard about a secret's value (it stays in page memory and
// is never drawn), so fragments of it are masked wherever they appear.
export async function guardSecret(page, value) {
  await page.evaluate((v) => {
    const body = v.replace(/^(sk_sandbox_|sk_live_|whsec_)/, '');
    window.__secretGrams ??= new Set();
    for (let i = 0; i + 5 <= body.length; i++) window.__secretGrams.add(body.slice(i, i + 5));
    window.dispatchEvent(new Event('resize'));
  }, value);
}

export async function openStudio(B, { browser = false } = {}) {
  const ctx = await chromium.launchPersistentContext(`${B}/chrome-profile`, {
    executablePath: '/opt/pw-browsers/chromium',
    headless: true,
    viewport: null,
    ignoreDefaultArgs: ['--enable-automation'],
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars', '--force-device-scale-factor=2', '--window-size=1920,1272'],
  });
  const editor = ctx.pages()[0] ?? (await ctx.newPage());
  await editor.addInitScript(SECRET_GUARD);
  const win = { editor };
  if (browser) {
    const cdp = await ctx.newCDPSession(editor);
    const opened = ctx.waitForEvent('page');
    await cdp.send('Target.createTarget', { url: 'about:blank', newWindow: true });
    win.browser = await opened;
    await cdp.detach();
  }
  for (const page of Object.values(win)) await fit(ctx, page);
  return { ctx, ...win };
}

// Resize the window until the page itself is exactly 1920x1080 CSS px (3840x2160
// at 2x). Headless keeps about 192px of height for browser UI it never draws.
async function fit(ctx, page) {
  const cdp = await ctx.newCDPSession(page);
  const { windowId } = await cdp.send('Browser.getWindowForTarget');
  for (let i = 0; i < 5; i++) {
    const [iw, ih] = await page.evaluate(() => [innerWidth, innerHeight]);
    if (iw === 1920 && ih === 1080) break;
    const { bounds } = await cdp.send('Browser.getWindowBounds', { windowId });
    await cdp.send('Browser.setWindowBounds', { windowId, bounds: { width: bounds.width + 1920 - iw, height: bounds.height + 1080 - ih } });
    await realSleep(300);
  }
  const size = await page.evaluate(() => [innerWidth, innerHeight, devicePixelRatio]);
  if (size.join() !== '1920,1080,2') throw new Error(`page is ${size}, expected 1920,1080,2`);
  await cdp.detach();
}

// One take: screencasts every window into <take>/<window>/frames and logs events.
export class Take {
  constructor(B, name, studio) {
    this.dir = `${B}/takes/${name}`;
    rmSync(this.dir, { recursive: true, force: true });
    mkdirSync(this.dir, { recursive: true });
    this.studio = studio;
    this.events = [];
    this.casts = {};
  }

  async start() {
    for (const name of ['editor', 'browser']) {
      const page = this.studio[name];
      if (!page) continue;
      const dir = `${this.dir}/${name}`;
      mkdirSync(`${dir}/frames`, { recursive: true });
      const cdp = await this.studio.ctx.newCDPSession(page);
      const cast = { cdp, dir, frames: [] };
      cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
        const i = cast.frames.length;
        cast.frames.push(metadata.timestamp);
        writeFileSync(`${dir}/frames/${String(i).padStart(6, '0')}.jpg`, Buffer.from(data, 'base64'));
        await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
      });
      await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 100, maxWidth: 3840, maxHeight: 2160, everyNthFrame: 1 });
      this.casts[name] = cast;
    }
    await realSleep(500);
    this.wall0 = Date.now() / 1000;
  }

  now() {
    return (Date.now() / 1000 - this.wall0) / SLOW;
  }

  // Events are in playback seconds; extra fields (x, y, url...) are in the
  // 1920x1080 layout of the window they belong to.
  mark(name, extra = {}) {
    const e = { name, t: Math.round(this.now() * 1000) / 1000, ...extra };
    this.events.push(e);
    console.log(`  ${e.t.toFixed(2).padStart(7)}s  ${name}`);
    return e;
  }

  async stop() {
    this.mark('end');
    const end = this.wall0 + this.events.at(-1).t * SLOW;
    for (const c of Object.values(this.casts)) await c.cdp.send('Page.stopScreencast');
    await realSleep(800);
    for (const c of Object.values(this.casts)) {
      writeFileSync(`${c.dir}/frames.json`, JSON.stringify({ wall0: this.wall0, end, slow: SLOW, frames: c.frames }));
    }
    // Mask rectangles from the in-page guard, converted to playback seconds.
    const log = await this.studio.editor.evaluate(() => window.__maskLog ?? []);
    const masks = log
      .map(({ wall, rects }) => ({ t: Math.round(((wall - this.wall0) / SLOW) * 1000) / 1000, rects }))
      .filter((m, i, a) => m.t >= 0 || a[i + 1]?.t > 0)
      .map((m) => ({ ...m, t: Math.max(0, m.t) }));
    writeFileSync(`${this.dir}/masks.json`, JSON.stringify(masks, null, 1));
    writeFileSync(`${this.dir}/events.json`, JSON.stringify(this.events, null, 2));
    console.log(`  frames: ${Object.entries(this.casts).map(([n, c]) => `${n} ${c.frames.length}`).join(', ')}; mask changes: ${masks.length}`);
  }
}

// Human-ish typing: quicker inside words, a beat at spaces and punctuation.
export async function typeText(page, text, pace = 1) {
  for (const ch of text) {
    await page.keyboard.type(ch);
    let d = rand(45, 95) * pace;
    if (ch === ' ') d *= 1.5;
    if ('.({,:'.includes(ch)) d *= 1.4;
    await sleep(d);
  }
}

// A breath at each line end. Leading indentation is typed as fast spaces.
export async function typeLines(page, lines, { onLine } = {}) {
  for (const [i, line] of lines.entries()) {
    const indent = line.match(/^ */)[0];
    if (indent) await page.keyboard.type(indent, { delay: 8 });
    await onLine?.(i, line);
    await typeText(page, line.slice(indent.length));
    if (i < lines.length - 1) {
      await page.keyboard.press('Enter');
      await sleep(line.trim() ? rand(250, 420) : 160);
    }
  }
}

// Where the editor caret is, in layout px.
export async function caret(page) {
  return page.evaluate(() => {
    const c = document.querySelector('.monaco-editor.focused .cursor') || document.querySelector('.monaco-editor .cursor');
    const r = c?.getBoundingClientRect();
    return r ? { x: Math.round(r.left), y: Math.round(r.top + r.height / 2) } : null;
  });
}

// Text of the focused terminal (or all terminals), one string per row.
export async function terminalRows(page, which = 'active') {
  return page.evaluate((which) => {
    const all = [...document.querySelectorAll('.terminal-wrapper')];
    const pick = which === 'active' ? all.filter((w) => w.classList.contains('active') || w.contains(document.activeElement)) : all;
    return (pick.length ? pick : all).map((w) => [...w.querySelectorAll('.xterm-rows > div')].map((r) => r.textContent.replace(/ /g, ' ').trimEnd()));
  }, which);
}

export async function waitForTerminal(page, re, { timeout = 120000 } = {}) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const text = (await page.evaluate(() => window.__terminalText?.() ?? [])).join('\n');
    const m = text.match(re);
    if (m) return m;
    await realSleep(150);
  }
  throw new Error(`terminal never showed ${re}`);
}

// Layout rect of the last non-empty row in the terminal that contains `re`.
export async function terminalLine(page, re) {
  return page.evaluate((src) => {
    const re = new RegExp(src);
    const rows = [...document.querySelectorAll('.xterm-rows > div')].filter((r) => re.test(r.textContent.replace(/ /g, ' ')));
    const row = rows.at(-1);
    if (!row) return null;
    const spans = [...row.querySelectorAll('span')].filter((s) => s.textContent.trim());
    const r = row.getBoundingClientRect();
    const right = spans.length ? Math.max(...spans.map((s) => s.getBoundingClientRect().right)) : r.right;
    return { x: Math.round(r.left), y: Math.round(r.top + r.height / 2), w: Math.round(right - r.left), h: Math.round(r.height) };
  }, re.source);
}
