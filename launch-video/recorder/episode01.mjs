// Records "Build it with Bachs" episode 01 one chapter at a time:
//
//   node episode01.mjs <node|python> <chapter> <recdir>
//
// Chapters: install, product, checkout, pay, webhooks, recap, cold-open.
// Takes land in <recdir>/takes/<chapter>. State a later chapter needs (the
// API key, PRODUCT_ID) is carried in <recdir>/session.env, which the terminal's
// bashrc sources, so every take continues the same session.
//
// Everything on screen is real: npm/pip installs, the Bachs API, the hosted
// checkout, the CLI and its webhooks. Secrets are typed from the environment
// and never reach a frame (see the guard in lib.mjs); verify_masks.py and
// verify_ocr.py prove it for every take.
import { execSync } from 'node:child_process';
import { chmodSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { caret, guardSecret, openStudio, rand, realSleep, sleep, Take, terminalLine, terminalRows, typeLines, typeText, waitForTerminal } from './lib.mjs';

const [lang, chapter, recArg] = process.argv.slice(2);
const B = recArg;
const P = `${B}/snapkit-checkout`;
const CODE = new URL(`../tutorials/01-accept-first-payment/${lang}/`, import.meta.url).pathname;
const read = (f) => readFileSync(`${CODE}/${f}`, 'utf8');

// ---------------------------------------------------------------- languages

// The server file is typed in two passes: the checkout route (chapter 4), then
// the webhook route (chapter 6). The first pass imports only what it uses; the
// webhook pass adds the rest to that import line. The final file is the
// tutorial file byte for byte.
function splitServer(src, { importLine, importFirst, checkoutEnd, webhookStart, tail }) {
  const L = src.split('\n');
  const iImport = L.findIndex((l) => l === importLine);
  const iEnd = L.findIndex(checkoutEnd);
  const iHook = L.findIndex(webhookStart);
  if (iImport < 0 || iEnd < 0 || iHook < 0) throw new Error('server file does not have the expected shape');
  const first = L.slice(0, iEnd + 1);
  first[iImport] = importFirst;
  const tailLines = tail(L);
  const pass1 = [...first, ...tailLines.before, ''];
  // The webhook block is inserted after the checkout route's last line.
  const between = L.slice(iEnd + 1, iHook); // blank separator lines
  const hook = L.slice(iHook, L.length - tailLines.after);
  const p = [...importLine].findIndex((c, i) => c !== importFirst[i]);
  const added = importLine.slice(p, p + importLine.length - importFirst.length);
  if (importFirst.slice(0, p) + added + importFirst.slice(p) !== importLine) throw new Error('import edit is not a single insertion');
  return { pass1, importRow: iImport + 1, importCol: p, importAdd: added, afterRow: iEnd + 1, between, hook, final: src };
}

const LANGS = {
  node: {
    // The code uses ES module imports, so the project says so before npm runs.
    seed: { 'package.json': JSON.stringify({ name: 'snapkit-node', private: true, type: 'module' }, null, 2) + '\n' },
    install: 'npm install @bachs/sdk express',
    installed: ['node_modules/@bachs/sdk/package.json', 'node_modules/express/package.json'],
    productFile: 'create-product.js',
    runProduct: 'node create-product.js',
    serverFile: 'server.js',
    runServer: 'node server.js',
    serverReady: /SnapKit running on/,
    server: () =>
      splitServer(read('server.js'), {
        importLine: "import { Bachs, webhooks } from '@bachs/sdk';",
        importFirst: "import { Bachs } from '@bachs/sdk';",
        checkoutEnd: (l, i, L) => l === '});' && L.slice(0, i).some((x) => x.startsWith("app.post('/checkout'")),
        webhookStart: (l) => l.startsWith("app.post('/webhooks'"),
        // app.listen closes the file and is typed with the checkout route, so
        // the server can run in chapter 5.
        tail: (L) => ({ before: ['', L.at(-2)], after: 3 }),
      }),
  },
  python: {
    seed: {},
    install: 'pip install bachs flask',
    installed: ['.venv/lib/python3.13/site-packages/bachs/__init__.py', '.venv/lib/python3.13/site-packages/flask/__init__.py'],
    productFile: 'create_product.py',
    runProduct: 'python create_product.py',
    serverFile: 'app.py',
    runServer: 'flask --app app run --port 3000',
    serverReady: /Running on http:\/\/127\.0\.0\.1:3000/,
    server: () =>
      splitServer(read('app.py'), {
        importLine: 'from bachs import Bachs, BachsWebhookError, webhooks',
        importFirst: 'from bachs import Bachs',
        checkoutEnd: (l) => l.startsWith('    return redirect('),
        webhookStart: (l) => l === '@app.post("/webhooks")',
        tail: () => ({ before: [], after: 1 }),
      }),
  },
};
const C = LANGS[lang];
if (!C) throw new Error(`unknown language ${lang}`);

// ---------------------------------------------------------------- session state

const ENV = `${B}/session.env`;
const loadEnv = () =>
  existsSync(ENV) ? Object.fromEntries([...readFileSync(ENV, 'utf8').matchAll(/^export (\w+)='([^']*)'$/gm)].map((m) => [m[1], m[2]])) : {};
const saveEnv = (k, v) => {
  const env = { ...loadEnv(), [k]: v };
  if (v === undefined) delete env[k];
  writeFileSync(ENV, Object.entries(env).map(([a, b]) => `export ${a}='${b}'`).join('\n') + '\n', { mode: 0o600 });
  chmodSync(ENV, 0o600);
};

const API_KEY = process.env.BACHS_API_KEY ?? process.env.Bachs;
if (!API_KEY?.startsWith('sk_sandbox_')) throw new Error('BACHS_API_KEY must be a sandbox key (sk_sandbox_…)');

// Each take starts clean: nothing left on port 3000, no CLI still forwarding.
function stopLeftovers() {
  execSync('fuser -k 3000/tcp >/dev/null 2>&1 || true');
  for (const pid of readdirSync('/proc').filter((d) => /^\d+$/.test(d) && Number(d) !== process.pid)) {
    try {
      const cmd = readFileSync(`/proc/${pid}/cmdline`, 'utf8').split('\0');
      if (cmd.some((a) => a.endsWith('@bachs/cli/bin/bachs.js') || a.endsWith('/bin/bachs')) && cmd.includes('listen')) process.kill(Number(pid));
    } catch {}
  }
}

// ---------------------------------------------------------------- studio helpers

let S; // studio
let take;
const ed = () => S.editor;
const press = (k) => ed().keyboard.press(k);

async function openWorkbench({ files = [], panel = false } = {}) {
  await ed().goto(`http://127.0.0.1:8080/?folder=${P}`);
  await ed().waitForSelector('.monaco-workbench', { timeout: 60000 });
  await realSleep(4000);
  await guardSecret(ed(), API_KEY);
  const env = loadEnv();
  if (env.BACHS_WEBHOOK_SECRET) await guardSecret(ed(), env.BACHS_WEBHOOK_SECRET);
  // Close whatever the last session restored, then open what this take needs.
  await press('Control+K');
  await press('Control+W');
  await realSleep(500);
  if (!panel && (await ed().locator('.part.panel').isVisible().catch(() => false))) {
    await press('Control+Alt+J');
    await realSleep(500);
  }
  for (const f of files) {
    await press('Control+P');
    await realSleep(500);
    await ed().keyboard.type(f, { delay: 20 });
    await realSleep(400);
    await press('Enter');
    await realSleep(1000);
  }
  await ed().addStyleTag({ content: '* { cursor: none !important; }' });
}

async function newTerminal() {
  await press('Control+Alt+T');
  await waitForTerminal(ed(), /❯/);
  await sleep(500);
}

// Type a shell command at a human pace and run it.
async function run(cmd, name) {
  await typeText(ed(), cmd);
  await sleep(rand(300, 450));
  take?.mark(name ?? `run:${cmd}`, { ...(await promptPos()) });
  await press('Enter');
}

async function promptPos() {
  const line = await terminalLine(ed(), /❯/);
  return line ? { x: line.x, y: line.y, w: line.w } : {};
}

// Type `export NAME=` and paste the value, the way a key is pasted, not typed.
async function exportValue(name, value, mark) {
  await typeText(ed(), `export ${name}=`);
  await sleep(rand(250, 400));
  take.mark(mark, await promptPos());
  await ed().keyboard.insertText(value);
  await sleep(rand(500, 700));
  await press('Enter');
  await sleep(400);
}

async function editorText(file) {
  await realSleep(1200); // files.autoSave is 300ms after the last keystroke
  return readFileSync(`${P}/${file}`, 'utf8');
}

function expectFile(file, want) {
  const got = readFileSync(`${P}/${file}`, 'utf8');
  if (got !== want) {
    writeFileSync(`${take.dir}/${file}.got`, got);
    throw new Error(`${file} does not match what should have been typed (saved as ${file}.got)`);
  }
  console.log(`  ${file}: matches the tutorial code`);
}

// Typing code with the camera's breadcrumbs: where each line starts and ends.
async function typeCode(lines, first) {
  await typeLines(ed(), lines, {
    onLine: async (i, line) => {
      if (!line.trim()) return;
      const c = await caret(ed());
      take.mark('line', { n: first + i, ...c, len: line.length });
    },
  });
}

// Lines of the editor that are on screen, as { n: [top, height] } in layout px.
async function editorLines() {
  return ed().evaluate(() => {
    const out = {};
    const ed = document.querySelector('.monaco-editor');
    for (const ln of ed.querySelectorAll('.line-numbers')) {
      const r = ln.getBoundingClientRect();
      out[ln.textContent.trim()] = [Math.round(r.top), Math.round(r.height)];
    }
    const code = ed.querySelector('.view-lines').getBoundingClientRect();
    return { lines: out, left: Math.round(code.left) };
  });
}

// ---------------------------------------------------------------- browser helpers

const br = () => S.browser;

// Move the (real) pointer like a hand would, logging keys the edit draws a cursor from.
let mouse = { x: 960, y: 700 };
async function pointTo(x, y, { click = false, ms = 700 } = {}) {
  take.mark('mouse', { x: mouse.x, y: mouse.y });
  // The real pointer travels the same eased path the edit draws, so hover
  // states change when the drawn cursor gets there.
  const steps = Math.max(8, Math.round(ms / 40));
  const from = mouse;
  for (let k = 1; k <= steps; k++) {
    const t = k / steps;
    const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    await br().mouse.move(from.x + (x - from.x) * e, from.y + (y - from.y) * e);
    await sleep(ms / steps);
  }
  mouse = { x, y };
  take.mark(click ? 'click' : 'mouse', { x, y });
  if (click) {
    await br().mouse.down();
    await sleep(90);
    await br().mouse.up();
  }
}

async function center(locator) {
  await locator.waitFor({ state: 'visible', timeout: 60000 });
  const b = await locator.boundingBox();
  return { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2) };
}

async function clickOn(locator, opts = {}) {
  const c = await center(locator);
  await pointTo(c.x + (opts.dx ?? 0), c.y, { click: true, ms: opts.ms ?? 700 });
  return c;
}

async function typeInto(locator, text, pace = 1.1) {
  await clickOn(locator, { dx: -40 });
  await sleep(250);
  await typeText(br(), text, pace);
  await sleep(300);
}

function trackUrl() {
  br().on('framenavigated', (f) => {
    if (f === br().mainFrame() && take) take.mark('url', { url: f.url() });
  });
}

// localhost:3000 → Buy → the hosted checkout → a test card → paid.
async function buyAndPay() {
  await br().goto('http://localhost:3000');
  await sleep(1200);
  take.mark('site');
  await clickOn(br().getByRole('button', { name: /Buy credits/ }));
  await br().waitForURL(/sandbox-checkout\.bachs\.io/, { timeout: 60000 });
  await br().getByRole('button', { name: /Continue to payment/ }).waitFor({ timeout: 60000 });
  await br().waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await sleep(1500);
  take.mark('checkout');
  await sleep(1500);
  await typeInto(br().locator('#identity-email'), 'ada@example.com');
  await typeInto(br().locator('#identity-name'), 'Ada Lovelace');
  await clickOn(br().getByRole('button', { name: /Continue to payment/ }));
  await sleep(1800);
  take.mark('methods');
  await sleep(600);
  await clickOn(br().getByRole('button', { name: 'Pay now' }));
  const card = br().frameLocator('iframe[name^="__privateStripeFrame"]').first();
  await card.locator('#payment-numberInput').waitFor({ timeout: 60000 });
  await sleep(1500);
  take.mark('card-form');
  await typeInto(card.locator('#payment-numberInput'), '4242424242424242', 1.3);
  await typeInto(card.locator('#payment-expiryInput'), '1234', 1.3);
  await typeInto(card.locator('#payment-cvcInput'), '123', 1.3);
  const zip = card.locator('#payment-postalCodeInput');
  if (await zip.isVisible().catch(() => false)) await typeInto(zip, '10001', 1.3);
  await sleep(500);
  await clickOn(br().getByRole('button', { name: /^Pay USD/ }));
  take.mark('pay');
  await br().getByText('Payment Successful').waitFor({ timeout: 120000 });
  await sleep(400);
  take.mark('paid');
}

// ---------------------------------------------------------------- chapters

const chapters = {
  // 2 · Install the SDK and add your key
  async install() {
    for (const [f, body] of Object.entries(C.seed)) writeFileSync(`${P}/${f}`, body);
    S = await openStudio(B);
    // The manifest is on screen while npm adds the dependencies to it.
    await openWorkbench({ files: Object.keys(C.seed).slice(0, 1) });
    take = new Take(B, 'install', S);
    await take.start();
    await sleep(1200);
    await press('Control+Alt+T');
    await waitForTerminal(ed(), /❯/);
    await sleep(900);
    take.mark('terminal', await promptPos());
    await run(C.install, 'install');
    for (let i = 0; i < 1200 && !C.installed.every((f) => existsSync(`${P}/${f}`)); i++) await realSleep(250);
    await waitForTerminal(ed(), /(added \d+ packages|Successfully installed)[\s\S]*❯\s*$/m);
    await sleep(900);
    take.mark('installed', await promptPos());
    await sleep(1400);
    await exportValue('BACHS_API_KEY', API_KEY, 'key');
    saveEnv('BACHS_API_KEY', API_KEY);
    take.mark('key-set', await promptPos());
    await sleep(2000);
  },

  // 3 · Create a product
  async product() {
    writeFileSync(`${P}/${C.productFile}`, '');
    S = await openStudio(B);
    await openWorkbench({ files: [C.productFile] });
    take = new Take(B, 'product', S);
    await take.start();
    await sleep(1200);
    await press('Control+1');
    await sleep(500);
    take.mark('type-start');
    const lines = read(C.productFile).split('\n');
    await typeCode(lines, 1);
    take.mark('type-end');
    await sleep(1500);
    expectFile(C.productFile, read(C.productFile));
    take.mark('lines', await editorLines());
    await newTerminal();
    take.mark('terminal', await promptPos());
    await sleep(600);
    await run(C.runProduct, 'run');
    const [id] = await waitForTerminal(ed(), /prod_[A-Za-z0-9]+/);
    await sleep(500);
    take.mark('product-id', { id, ...(await terminalLine(ed(), new RegExp(id))) });
    await sleep(1800);
    await typeText(ed(), 'export PRODUCT_ID=');
    await sleep(300);
    take.mark('paste-id', await promptPos());
    await ed().keyboard.insertText(id);
    await sleep(600);
    await press('Enter');
    saveEnv('PRODUCT_ID', id);
    await sleep(1800);
  },

  // 4 · The checkout route
  async checkout() {
    const s = C.server();
    writeFileSync(`${P}/${C.serverFile}`, '');
    S = await openStudio(B);
    await openWorkbench({ files: [C.serverFile] });
    take = new Take(B, 'checkout', S);
    await take.start();
    await sleep(1200);
    await press('Control+1');
    await sleep(500);
    take.mark('type-start');
    await typeCode(s.pass1, 1);
    take.mark('type-end');
    await sleep(2000);
    expectFile(C.serverFile, s.pass1.join('\n'));
    take.mark('lines', await editorLines());
  },

  // 5 · Make a test payment
  async pay() {
    saveEnv('BACHS_WEBHOOK_SECRET', undefined); // set on camera in chapter 6
    S = await openStudio(B, { browser: true });
    await openWorkbench({ files: [C.serverFile] });
    await br().goto('about:blank');
    trackUrl();
    take = new Take(B, 'pay', S);
    await take.start();
    await sleep(1000);
    await newTerminal();
    take.mark('terminal', await promptPos());
    await sleep(500);
    await run(C.runServer, 'run');
    await waitForTerminal(ed(), C.serverReady);
    await sleep(600);
    take.mark('server-ready', await terminalLine(ed(), C.serverReady));
    await sleep(1500);
    take.mark('to-browser');
    await sleep(600);
    await buyAndPay();
    await sleep(3500);
  },

  // 6 · Webhooks
  async webhooks() {
    const s = C.server();
    saveEnv('BACHS_WEBHOOK_SECRET', undefined); // set on camera below
    S = await openStudio(B, { browser: true });
    await openWorkbench({ files: [C.serverFile], panel: true });
    // Off camera: the server from chapter 5 is still running.
    await newTerminal();
    await ed().keyboard.type(C.runServer, { delay: 5 });
    await press('Enter');
    await waitForTerminal(ed(), C.serverReady);
    await realSleep(800);
    await br().goto('about:blank');
    trackUrl();
    take = new Take(B, 'webhooks', S);
    await take.start();
    await sleep(1200);

    // The import gains what the webhook route needs.
    await press('Control+1');
    await sleep(500);
    await press('Control+Home');
    for (let i = 1; i < s.importRow; i++) await press('ArrowDown');
    await press('Home');
    for (let i = 0; i < s.importCol; i++) await press('ArrowRight');
    await sleep(500);
    take.mark('import', await caret(ed()));
    await typeText(ed(), s.importAdd);
    await sleep(900);

    // The webhook route, after the checkout route.
    await press('Control+Home');
    for (let i = 1; i < s.afterRow; i++) await press('ArrowDown');
    await press('End');
    await sleep(600);
    for (let i = 0; i < s.between.length + 1; i++) {
      await press('Enter');
      await sleep(160);
    }
    take.mark('type-start');
    await typeCode(s.hook, s.afterRow + s.between.length + 1);
    take.mark('type-end');
    await sleep(2000);
    expectFile(C.serverFile, s.final);
    take.mark('lines', await editorLines());

    // A second terminal beside the server: forward sandbox events here.
    await press('Control+Alt+S');
    await waitForTerminal(ed(), /❯[^\n]*\n[\s\S]*❯/);
    await sleep(800);
    take.mark('cli-terminal', await promptPos());
    await run('bachs listen --forward-to localhost:3000/webhooks', 'listen');
    const [, secret] = await waitForTerminal(ed(), /signing secret is (whsec_[A-Za-z0-9_]+)/);
    await guardSecret(ed(), secret);
    saveEnv('BACHS_WEBHOOK_SECRET', secret);
    await sleep(600);
    take.mark('listen-ready', await terminalLine(ed(), /signing secret is/));
    await sleep(2200);

    // Back in the server's terminal: stop it, add the secret, start it again.
    await press('Control+Alt+ArrowLeft');
    await sleep(700);
    take.mark('server-terminal', await promptPos());
    await press('Control+C');
    await sleep(900);
    await exportValue('BACHS_WEBHOOK_SECRET', secret, 'secret');
    await run(C.runServer, 'restart');
    await waitForTerminal(ed(), new RegExp(`${C.serverReady.source}[\\s\\S]*${C.serverReady.source}`));
    await sleep(600);
    take.mark('server-ready', await terminalLine(ed(), C.serverReady));
    await sleep(1500);

    take.mark('to-browser');
    await sleep(600);
    await buyAndPay();
    const [line] = await waitForTerminal(ed(), /Order \S+ paid: 10\.00 USD/, { timeout: 120000 });
    await sleep(300);
    take.mark('order-paid', { line, ...(await terminalLine(ed(), /Order \S+ paid/)) });
    take.mark('cli-delivered', await terminalLine(ed(), /checkout\.completed/));
    await sleep(4500);
  },

  // 7 · Recap: the finished files, part by part
  async recap() {
    S = await openStudio(B);
    await openWorkbench({ files: [C.productFile, C.serverFile] });
    take = new Take(B, 'recap', S);
    await take.start();
    await sleep(600);
    await press('Control+1');
    await press('Control+PageUp'); // the product file
    await sleep(1500);
    take.mark('product', await editorLines());
    await sleep(3000);
    await press('Control+PageDown'); // the server file
    await sleep(1500);
    take.mark('server', await editorLines());
    await sleep(3000);
    await press('Control+End');
    await sleep(1500);
    take.mark('server-end', await editorLines());
    await sleep(3000);
  },

  // 0 · Cold open: the finished app, paid for real
  async 'cold-open'() {
    S = await openStudio(B, { browser: true });
    await openWorkbench({ files: [C.serverFile], panel: true });
    // Off camera: the server on the left, the CLI forwarding on the right.
    await newTerminal();
    await press('Control+Alt+S');
    await waitForTerminal(ed(), /❯[^\n]*\n[\s\S]*❯/);
    await ed().keyboard.type('bachs listen --forward-to localhost:3000/webhooks', { delay: 5 });
    await press('Enter');
    const [, secret] = await waitForTerminal(ed(), /signing secret is (whsec_[A-Za-z0-9_]+)/);
    await guardSecret(ed(), secret);
    saveEnv('BACHS_WEBHOOK_SECRET', secret);
    await press('Control+Alt+K');
    await press('Control+Alt+ArrowLeft');
    await realSleep(500);
    await ed().keyboard.type('export BACHS_WEBHOOK_SECRET=', { delay: 5 });
    await ed().keyboard.insertText(secret);
    await press('Enter');
    await ed().keyboard.type(C.runServer, { delay: 5 });
    await press('Enter');
    await waitForTerminal(ed(), C.serverReady);
    await realSleep(500);
    await press('Control+Alt+K');
    await realSleep(800);
    await br().goto('about:blank');
    trackUrl();
    take = new Take(B, 'cold-open', S);
    await take.start();
    await sleep(600);
    await buyAndPay();
    const [line] = await waitForTerminal(ed(), /Order \S+ paid: 10\.00 USD/, { timeout: 120000 });
    await sleep(300);
    take.mark('order-paid', { line, ...(await terminalLine(ed(), /Order \S+ paid/)) });
    take.mark('cli-delivered', await terminalLine(ed(), /checkout\.completed/));
    await sleep(3500);
  },
};

if (!chapters[chapter]) throw new Error(`unknown chapter ${chapter}; one of ${Object.keys(chapters).join(', ')}`);
console.log(`${lang} · ${chapter}`);
stopLeftovers();
try {
  await chapters[chapter]();
  await take.stop();
  const rows = (await terminalRows(ed(), 'all')).flat().filter(Boolean);
  writeFileSync(`${take.dir}/terminal.txt`, rows.join('\n').replace(/(sk_sandbox_|whsec_)[A-Za-z0-9_]+/g, '$1••••') + '\n');
} finally {
  // Stop anything the take started (servers, the CLI) with the browser.
  await S?.ctx.close();
  stopLeftovers();
}
