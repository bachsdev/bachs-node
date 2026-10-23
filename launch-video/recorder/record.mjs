// Records a scripted VS Code (code-server) session as 4K frames straight from
// the browser's compositor, each with its paint timestamp.
//
// Software rendering can only paint about 6 frames a second at 4K, so the
// session runs SLOW times slower than real life and assemble.py speeds it back
// up: every keystroke gets its own frame and typing plays back smoothly.
import { chromium } from 'playwright-core';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';

const B = process.argv[2];
const SLOW = 3;
const FR = `${B}/frames`;
rmSync(FR, { recursive: true, force: true });
mkdirSync(FR);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms * SLOW));
const rand = (a, b) => a + Math.random() * (b - a);

const ctx = await chromium.launchPersistentContext(`${B}/chrome-profile`, {
  executablePath: '/opt/pw-browsers/chromium',
  headless: true,
  viewport: null,
  ignoreDefaultArgs: ['--enable-automation'],
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars', '--force-device-scale-factor=2', '--window-size=1920,1272'],
});
const page = ctx.pages()[0] ?? (await ctx.newPage());
const cdp = await ctx.newCDPSession(page);

// Fit the window so the page itself is exactly 1920x1080 CSS px (3840x2160 at 2x).
const { windowId } = await cdp.send('Browser.getWindowForTarget');
for (let i = 0; i < 3; i++) {
  const [iw, ih] = await page.evaluate(() => [innerWidth, innerHeight]);
  if (iw === 1920 && ih === 1080) break;
  const { bounds } = await cdp.send('Browser.getWindowBounds', { windowId });
  await cdp.send('Browser.setWindowBounds', { windowId, bounds: { width: bounds.width + 1920 - iw, height: bounds.height + 1080 - ih } });
  await new Promise((r) => setTimeout(r, 300));
}
const size = await page.evaluate(() => [innerWidth, innerHeight, devicePixelRatio]);
if (size.join() !== '1920,1080,2') throw new Error(`page is ${size}, expected 1920,1080,2`);

await page.goto(`http://127.0.0.1:8080/?folder=${B}/snapkit-checkout`);
await page.waitForSelector('.monaco-workbench', { timeout: 60000 });
await new Promise((r) => setTimeout(r, 5000));
// Open the empty file before recording starts.
await page.keyboard.press('Control+P');
await new Promise((r) => setTimeout(r, 600));
await page.keyboard.type('checkout.js', { delay: 30 });
await page.keyboard.press('Enter');
await new Promise((r) => setTimeout(r, 1500));
await page.addStyleTag({ content: '* { cursor: none !important; }' });

// Start recording.
const frames = [];
cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
  const i = frames.length;
  frames.push(metadata.timestamp);
  writeFileSync(`${FR}/${String(i).padStart(6, '0')}.jpg`, Buffer.from(data, 'base64'));
  await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
});
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 100, maxWidth: 3840, maxHeight: 2160, everyNthFrame: 1 });
await new Promise((r) => setTimeout(r, 500));
const wall0 = Date.now() / 1000;
const events = [];
const mark = (name) => events.push({ name, t: (Date.now() / 1000 - wall0) / SLOW }); // in playback seconds
await sleep(1500);

// Human-ish typing: quicker inside words, a beat at spaces and punctuation, a breath at line ends.
const typeText = async (text) => {
  for (const ch of text) {
    await page.keyboard.type(ch);
    let d = rand(45, 95);
    if (ch === ' ') d *= 1.5;
    if ('.({,:'.includes(ch)) d *= 1.4;
    await sleep(d);
  }
};
const typeLines = async (lines) => {
  for (const line of lines) {
    await typeText(line);
    await page.keyboard.press('Enter');
    await sleep(rand(250, 420));
  }
};

// Terminal first (Ctrl+Alt+T is bound to "new terminal" in keybindings.json): a real install from npm.
await page.keyboard.press('Control+Alt+T');
await sleep(1500);
mark('terminal');
await typeText('npm install @bachs/sdk');
await sleep(400);
mark('enter');
await page.keyboard.press('Enter');
const installed = `${B}/snapkit-checkout/node_modules/@bachs/sdk/package.json`;
for (let i = 0; i < 400 && !existsSync(installed); i++) await new Promise((r) => setTimeout(r, 250));
await sleep(1800);
mark('installed');
await sleep(800);

// Back to the editor (Ctrl+1 focuses the first editor group) and write the client.
await page.keyboard.press('Control+1');
await sleep(900);
mark('type-start');
await typeLines(["import { Bachs } from '@bachs/sdk';", '']);
mark('client-start');
await typeLines(['const bachs = new Bachs({', '  apiKey: process.env.BACHS_API_KEY,', '});']);
mark('type-end');
await sleep(1500);
mark('end');

await cdp.send('Page.stopScreencast');
await new Promise((r) => setTimeout(r, 800));
writeFileSync(`${B}/frames.json`, JSON.stringify({ wall0, end: wall0 + events.at(-1).t * SLOW, slow: SLOW, frames }));
writeFileSync(`${B}/events.json`, JSON.stringify(events, null, 2));
await ctx.close();
console.log(JSON.stringify(events));
