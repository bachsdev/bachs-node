import type { Chapter, TakeData } from './timeline';
import install from './node/install.json';
import product from './node/product.json';
import checkout from './node/checkout.json';
import pay from './node/pay.json';
import webhooks from './node/webhooks.json';
import recap from './node/recap.json';
import coldOpen from './node/cold-open.json';

// The Node.js cut. Narration is script.md, line for line; each beat sits on
// the moment in its take that the line talks about.

export const nodeTakes = { install, product, checkout, pay, webhooks, recap, 'cold-open': coldOpen } as unknown as Record<string, TakeData>;

const line = (n: number, off = 0) => ({ ev: 'line', n, off });

export const nodeChapters: Chapter[] = [
  {
    id: 'cold-open',
    beats: [
      // The store holds while the line plays; the click and redirect follow.
      { take: 'cold-open', win: 'browser', from: { ev: 'site', off: -0.6 }, to: { ev: 'click', off: -0.05 }, say: 'This is a real payment, start to finish, in the Bachs sandbox.' },
      { take: 'cold-open', win: 'browser', from: { ev: 'click', off: -0.05 }, to: { ev: 'url', nth: 1, off: 0.4 } },
      { take: 'cold-open', win: 'browser', from: 'checkout', to: 'card-form', speed: 4, say: 'A customer clicks buy, pays on the Bachs checkout page,' },
      { take: 'cold-open', win: 'browser', from: 'card-form', to: { ev: 'paid', off: 0.8 }, speed: 4 },
      { take: 'cold-open', win: 'editor', from: { ev: 'order-paid', off: -0.8 }, to: 'end', say: "and our server knows it's been paid." },
      { card: { kind: 'title' }, say: "Let's build it from scratch.", min: 3 },
    ],
  },
  {
    id: 'what-you-need',
    beats: [
      { card: { kind: 'checklist', show: 0 }, say: 'You need three things.' },
      { card: { kind: 'checklist', show: 1 }, say: "A Bachs sandbox API key. It starts with sk_sandbox_, and it lets you test everything without moving real money." },
      { card: { kind: 'checklist', show: 2 }, say: 'Node.js 22 or newer.' },
      { card: { kind: 'checklist', show: 3 }, say: "And the Bachs CLI, which we'll use to test webhooks on your own machine." },
      { card: { kind: 'checklist', show: 3 }, say: 'Links to all three are in the description.' },
    ],
  },
  {
    id: 'install',
    beats: [
      { card: { kind: 'chapter', n: '02', title: 'Install the SDK and add your key' } },
      { take: 'install', win: 'editor', from: 0, to: 'install', step: 'Install the SDK and Express', say: 'First, install the Bachs SDK.' },
      { take: 'install', win: 'editor', from: 'install', to: { ev: 'installed', off: 0.8 }, say: "We'll also use Express for our little web server." },
      { take: 'install', win: 'editor', from: { ev: 'installed', off: 0.8 }, to: { ev: 'key-set', off: 0.4 }, step: 'Add your sandbox key', say: 'Then put your sandbox key in an environment variable called BACHS_API_KEY.' },
      { take: 'install', win: 'editor', from: { ev: 'key-set', off: 0.4 }, to: 'end', say: 'Keep it there: never in your code, and never in anything that reaches the browser.' },
      { take: 'install', win: 'editor', from: 'end', to: 'end', say: 'Your secret key only ever lives on your server.' },
    ],
  },
  {
    id: 'product',
    beats: [
      { card: { kind: 'chapter', n: '03', title: 'Create a product' } },
      { take: 'product', win: 'editor', from: 0, to: line(3), step: 'Create a product', say: "Every checkout sells a product, so let's create one: a SnapKit credit pack for ten dollars." },
      { take: 'product', win: 'editor', from: line(3), to: line(5), say: "We create a client with our key. The SDK works out from the key that this is the sandbox, so there's nothing else to configure." },
      { take: 'product', win: 'editor', from: line(5), to: line(7), say: 'Look at the price: the amount is the string "10.00", not a number.' },
      { take: 'product', win: 'editor', from: line(7), to: line(7), say: 'Bachs always uses decimal strings for money, so nothing ever gets rounded on the way.' },
      { take: 'product', win: 'editor', from: line(7), to: 'type-end', say: 'And this idempotency key means that if the script runs twice by accident, you still get one product, not two.' },
      { take: 'product', win: 'editor', from: 'type-end', to: 'end', step: 'Run it and save the ID', say: 'Run it, and copy the product ID it prints into PRODUCT_ID.' },
    ],
  },
  {
    id: 'checkout',
    beats: [
      { card: { kind: 'chapter', n: '04', title: 'The checkout route' } },
      { take: 'checkout', win: 'editor', from: 0, to: line(8), speed: 1.6, step: 'Write the checkout route', say: 'Now the server.' },
      { take: 'checkout', win: 'editor', from: line(8), to: line(10), say: 'The store page is ready-made in the public folder, so Express just serves it. Its Buy button posts to /checkout, and that\'s the route we write.' },
      { take: 'checkout', win: 'editor', from: line(10), to: line(11), say: 'In the checkout route we do three things.' },
      { take: 'checkout', win: 'editor', from: line(11), to: line(12), say: 'One: make an order ID. In a real app this is the order you save in your database.' },
      { take: 'checkout', win: 'editor', from: line(12), to: line(14), say: "Two: ask Bachs for a checkout session. The cart is our product, and the reference is our order ID, so every payment can be matched back to the order it's for." },
      { take: 'checkout', win: 'editor', from: line(14), to: line(16), say: 'The idempotency key is tied to that same order, so a retry can never create a second checkout.' },
      { take: 'checkout', win: 'editor', from: line(16), to: line(19), say: 'Three: send the customer to the checkout_url Bachs gives back.' },
      { take: 'checkout', win: 'editor', from: line(19), to: 'end', say: "Bachs hosts the whole payment page: every payment method your account has switched on, in your customer's own currency. You don't build any of it." },
    ],
  },
  {
    id: 'pay',
    beats: [
      { card: { kind: 'chapter', n: '05', title: 'Make a test payment' } },
      { take: 'pay', win: 'editor', from: 0, to: { ev: 'server-ready', off: 1 }, step: 'Start the server and pay', say: 'Start the server, open it in the browser, and click Buy.' },
      { take: 'pay', win: 'browser', from: { ev: 'site', off: -0.6 }, to: { ev: 'checkout', off: 0.2 } },
      { take: 'pay', win: 'browser', from: { ev: 'checkout', off: 0.2 }, to: 'methods', speed: 1.5, say: "That's the Bachs checkout, running in the sandbox, so we can pay with a test card." },
      { take: 'pay', win: 'browser', from: 'methods', to: 'pay', speed: 2, say: 'Any card number works, apart from a few special ones that simulate a decline. Those are listed in the docs.' },
      { take: 'pay', win: 'browser', from: 'pay', to: { ev: 'paid', off: 1 }, say: 'One thing you\'ll notice: there\'s no "return to your site" link here.' },
      { take: 'pay', win: 'browser', from: { ev: 'paid', off: 1 }, to: 'end', say: "Bachs won't send customers back to localhost, even in the sandbox. In production you add a success_url that points at your real thank-you page." },
      { take: 'pay', win: 'browser', from: 'end', to: 'end', say: "Paid. But here's the question: how does our server know?" },
    ],
  },
  {
    id: 'webhooks',
    beats: [
      { card: { kind: 'statement', text: "A redirect isn't proof of payment." }, step: '', say: 'The most common mistake is treating the redirect back to your site as proof of payment.' },
      { card: { kind: 'statement', text: "A redirect isn't proof of payment." }, say: 'A customer can close the tab before it happens, or open your success page without paying at all.' },
      { take: 'webhooks', win: 'editor', from: 0, to: 'type-start', step: 'Add the webhook route', say: 'The source of truth is a webhook: Bachs calls your server when the payment completes.' },
      { take: 'webhooks', win: 'editor', from: 'type-start', to: line(20), say: "Here's our webhook route. The important part: express.raw. We need the body exactly as it arrived, before anything parses it, because that's what the signature was made from." },
      { take: 'webhooks', win: 'editor', from: line(20), to: line(23), say: 'constructEvent checks the signature with our webhook secret.' },
      { take: 'webhooks', win: 'editor', from: line(23), to: line(26), say: 'If someone sends a fake request, it fails, and we answer 400.' },
      { take: 'webhooks', win: 'editor', from: line(26), to: 'type-end', say: 'When the event is checkout.completed, we read the reference, which is our order ID, and mark that order as paid.' },
      { take: 'webhooks', win: 'editor', from: 'type-end', to: { ev: 'listen-ready', off: 1.2 }, speed: 1.2, step: 'Forward events with the CLI', say: 'To test it locally, the Bachs CLI forwards real sandbox events to your machine. No deploying, and no tunnel.' },
      { take: 'webhooks', win: 'editor', from: { ev: 'listen-ready', off: 1.2 }, to: { ev: 'server-ready', off: 0.8 }, say: 'It prints a signing secret just for this session; put that in BACHS_WEBHOOK_SECRET.' },
      { take: 'webhooks', win: 'browser', from: { ev: 'site', off: -0.4 }, to: { ev: 'paid', off: 0.6 }, speed: 3.5, step: 'Pay again', say: 'Now pay one more time…' },
      { take: 'webhooks', win: 'editor', from: { ev: 'order-paid', off: -0.6 }, to: 'end', say: 'and there it is. Bachs signed the event, our server verified it, and order paid.' },
      { take: 'webhooks', win: 'editor', from: 'end', to: 'end', say: "That's the moment you fulfil the order." },
    ],
  },
  {
    id: 'recap',
    beats: [
      { card: { kind: 'chapter', n: '07', title: 'Recap' }, step: '' },
      { take: 'recap', win: 'editor', from: 'product', to: 'server', hl: { at: 'product', from: 5, to: 8 }, say: "That's a complete payment flow: a product," },
      { take: 'recap', win: 'editor', from: 'server', to: 'server', hl: { at: 'server', from: 10, to: 17 }, say: 'a checkout session tied to your order,' },
      { take: 'recap', win: 'editor', from: 'server', to: 'server', hl: { at: 'server', from: 16, to: 16 }, say: 'the hosted checkout,' },
      { take: 'recap', win: 'editor', from: 'server', to: 'server-end', hl: { at: 'server', from: 19, to: 31 }, say: "and a verified webhook telling you it's paid." },
      { card: { kind: 'end' }, say: 'In the next episode we make that webhook bulletproof: duplicates, retries, and events that arrive out of order.' },
      { card: { kind: 'end' }, say: 'The code from this video is linked in the description. See you in the next one.' },
    ],
  },
];
