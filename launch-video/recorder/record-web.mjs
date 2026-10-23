// Records a real purchase on the SnapKit demo store (snapkit.bachs.io): browse,
// Buy, the Bachs overlay checkout, a test card payment, and the success toast.
//
// Same capture as record.mjs: 4K frames from the compositor with paint
// timestamps, run SLOW times slower than real life and rebuilt at normal speed
// by assemble.py. It also logs the pointer path (in 1600x900 page coordinates)
// so the edit can draw a smooth cursor and zoom onto what is being clicked.
import { chromium } from 'playwright-core';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';

const B = process.argv[2];
// Slow-motion factor; raised inside the checkout, whose payment frames paint slowly.
let slow = 3;
const breaks = []; // { wall, play, slow }: where the factor changes
const VW = 1600;
const VH = 900;
const FR = `${B}/frames`;
rmSync(FR, { recursive: true, force: true });
mkdirSync(FR, { recursive: true });

const real = (ms) => new Promise((r) => setTimeout(r, ms));
const sleep = (ms) => real(ms * slow);
const rand = (a, b) => a + Math.random() * (b - a);

const ctx = await chromium.launchPersistentContext(`${B}/chrome-profile`, {
  executablePath: '/opt/pw-browsers/chromium',
  headless: true,
  viewport: null,
  ignoreDefaultArgs: ['--enable-automation'],
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars', '--force-device-scale-factor=2', `--window-size=${VW},${VH + 192}`],
});
const page = ctx.pages()[0] ?? (await ctx.newPage());
const cdp = await ctx.newCDPSession(page);

// Fit the window so the page is exactly VW x VH CSS px (2x on screen).
const { windowId } = await cdp.send('Browser.getWindowForTarget');
for (let i = 0; i < 3; i++) {
  const [iw, ih] = await page.evaluate(() => [innerWidth, innerHeight]);
  if (iw === VW && ih === VH) break;
  const { bounds } = await cdp.send('Browser.getWindowBounds', { windowId });
  await cdp.send('Browser.setWindowBounds', { windowId, bounds: { width: bounds.width + VW - iw, height: bounds.height + VH - ih } });
  await real(300);
}
const size = await page.evaluate(() => [innerWidth, innerHeight, devicePixelRatio]);
if (size.join() !== `${VW},${VH},2`) throw new Error(`page is ${size}`);

await page.goto('https://snapkit.bachs.io', { waitUntil: 'networkidle', timeout: 60000 });
await page.addStyleTag({ content: '*, *::before { cursor: none !important; } html { scroll-behavior: auto !important; }' });
await page.mouse.move(VW * 0.62, VH * 0.72);
await real(2500);

// Start recording.
const frames = [];
cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
  const i = frames.length;
  frames.push(metadata.timestamp);
  writeFileSync(`${FR}/${String(i).padStart(6, '0')}.jpg`, Buffer.from(data, 'base64'));
  await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
});
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 100, maxWidth: VW * 2, maxHeight: VH * 2, everyNthFrame: 1 });
await real(600);
const wall0 = Date.now() / 1000;
breaks.push({ wall: wall0, play: 0, slow });
const now = () => { const b = breaks.at(-1); return b.play + (Date.now() / 1000 - b.wall) / b.slow; }; // playback seconds
const setSlow = (n) => { const play = now(); slow = n; breaks.push({ wall: Date.now() / 1000, play, slow }); };
const events = [];
const pointer = [];
let px = VW * 0.62;
let py = VH * 0.72;
const mark = (name) => events.push({ name, t: now() });
pointer.push({ t: 0, x: px, y: py });

// Glide the pointer to a target on an eased curve, then optionally click.
const moveTo = async (x, y, ms = 650) => {
  const steps = Math.max(8, Math.round(ms / 40));
  const x0 = px;
  const y0 = py;
  pointer.push({ t: now(), x: x0, y: y0 });
  for (let i = 1; i <= steps; i++) {
    const k = i / steps;
    const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    await page.mouse.move(x0 + (x - x0) * e, y0 + (y - y0) * e);
    await sleep(ms / steps);
  }
  px = x;
  py = y;
  pointer.push({ t: now(), x, y });
};
const clickOn = async (locator, name, ms) => {
  await locator.waitFor({ state: 'visible', timeout: 60000 });
  const box = await locator.boundingBox();
  const x = box.x + box.width / 2 + rand(-6, 6);
  const y = box.y + box.height / 2 + rand(-2, 2);
  await moveTo(x, y, ms);
  await sleep(rand(120, 220));
  mark(name);
  pointer.push({ t: now(), x, y, click: true });
  await page.mouse.down();
  await sleep(70);
  await page.mouse.up();
};
const typeSlow = async (text, base = 85) => {
  for (const ch of text) {
    await page.keyboard.type(ch);
    await sleep(rand(base * 0.6, base * 1.3));
  }
};

await sleep(1800);

// Scroll from the hero down to the pricing section, like a person with a trackpad.
mark('scroll');
const buy = page.getByRole('button', { name: /Buy for \$10/ }).first();
const target = (await buy.evaluate((el) => el.getBoundingClientRect().top + scrollY)) - VH * 0.62;
let y = 0;
while (y < target) {
  const step = Math.min(target - y, 26 + 30 * Math.sin(Math.PI * Math.min(1, y / target)));
  await page.mouse.wheel(0, step);
  y += step;
  await sleep(16);
}
await sleep(700);
mark('pricing');

await clickOn(buy, 'buy', 800);
await sleep(900);
await clickOn(page.getByRole('button', { name: /Continue as guest/i }), 'guest', 650);

const co = page.frameLocator('iframe[src*="checkout.bachs.io"]');
await co.getByRole('button', { name: /Pay now/i }).waitFor({ timeout: 60000 });
mark('checkout');
setSlow(8);
await sleep(1600);
await clickOn(co.getByRole('button', { name: /Pay now/i }), 'paynow', 800);

// Card fields live in a nested payment frame.
let cardFrame;
for (let i = 0; i < 80 && !cardFrame; i++) {
  for (const f of page.frames()) if (await f.locator('input[name="number"]').count().catch(() => 0)) cardFrame = f;
  if (!cardFrame) await real(250);
}
if (!cardFrame) throw new Error('card form not found');
await real(1500);
const field = (name) => cardFrame.locator(`input[name="${name}"]`);
mark('card');
await clickOn(field('number'), 'number', 600);
await typeSlow('4242424242424242', 70);
mark('number-done');
await sleep(250);
await clickOn(field('expiry'), 'expiry', 450);
await typeSlow('0933', 110);
await sleep(200);
await clickOn(field('cvc'), 'cvc', 400);
await typeSlow('431', 110);
await sleep(200);
const zip = field('postalCode');
if (await zip.count()) {
  await clickOn(zip, 'zip', 450);
  await typeSlow('10001', 100);
}
mark('card-done');
await sleep(500);
await clickOn(co.getByRole('button', { name: /^Pay USD/ }), 'pay', 700);

// Wait for the success screen, then SnapKit's own toast once the overlay closes.
await co.getByText(/Payment Successful/i).waitFor({ timeout: 90000 });
mark('success');
await page.getByText(/Payment complete/i).waitFor({ timeout: 90000 });
mark('toast');
await moveTo(px + 140, py + 120, 900);
await sleep(2200);
mark('end');

await cdp.send('Page.stopScreencast');
await real(800);
writeFileSync(`${B}/frames.json`, JSON.stringify({ wall0, end: Date.now() / 1000, breaks, frames }));
writeFileSync(`${B}/events.json`, JSON.stringify({ size: [VW, VH], events, pointer }, null, 1));
await ctx.close();
console.log(JSON.stringify(events.map((e) => [e.name, +e.t.toFixed(2)])));
