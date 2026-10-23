# Build it with Bachs · 01: Accept your first payment

Two cuts from one script: **Node.js** and **Python**. The narration is shared; lines
marked **[Node]** or **[Python]** are read only for that cut. Each cut runs about
**5½–6 minutes** at a relaxed reading pace (~150 words a minute).

The code on screen is in `node/` and `python/` next to this file. It was checked
against the published packages (`@bachs/sdk` 2.0.0, `bachs` 2.0.0): both serve the
store page, take a real sandbox card payment, verify the `checkout.completed` webhook
from `bachs listen`, and reject unsigned webhooks.

---

## Recording your voice

- Record **one voice memo per chapter** on your phone, named like `node-03-product.m4a`.
  Shared chapters only need recording once.
- Find the quietest, softest room you can. A wardrobe full of clothes is a great booth.
  Phone about a hand's width from your mouth, slightly to the side.
- Read naturally, as if explaining to a friend. Pauses are fine: I cut to your voice,
  not the other way round. If you stumble, just repeat the sentence and keep going.
- Leave 2 seconds of silence at the start of each memo (I use it to remove room noise).

---

## 0 · Cold open (0:00–0:15) · shared

**Screen:** the finished app, the SnapKit store page. Click **Buy credits for $10** → the Bachs hosted checkout
(sandbox banner visible) → pay with a test card → camera moves to the terminal, which
prints `Order 3f2c… paid: 10.00 USD`.

**Voice:**
> This is a real payment, start to finish, in the Bachs sandbox. A customer clicks buy,
> pays on the Bachs checkout page, and our server knows it's been paid.
> Let's build it from scratch.

## 1 · What you need (0:15–0:40) · per language

**Screen:** title card "Build it with Bachs · 01", then a three-item checklist.

**Voice:**
> You need three things. A Bachs sandbox API key. It starts with `sk_sandbox_`, and it
> lets you test everything without moving real money.
> **[Node]** Node.js 22 or newer.
> **[Python]** Python 3.10 or newer.
> And the Bachs CLI, which we'll use to test webhooks on your own machine.
> Links to all three are in the description.

## 2 · Install the SDK and add your key (0:40–1:15) · per language

**Screen:** terminal.
- **[Node]** `npm install @bachs/sdk express`
- **[Python]** `pip install bachs flask`
- Then `export BACHS_API_KEY=sk_sandbox_…` (the key is masked on screen).

**Voice:**
> First, install the Bachs SDK.
> **[Node]** We'll also use Express for our little web server.
> **[Python]** We'll also use Flask for our little web server.
> Then put your sandbox key in an environment variable called `BACHS_API_KEY`.
> Keep it there: never in your code, and never in anything that reaches the browser.
> Your secret key only ever lives on your server.

## 3 · Create a product (1:15–2:00) · per language

**Screen:** editor, typing `create-product.js` / `create_product.py`; then run it in
the terminal, which prints a `prod_…` ID; then `export PRODUCT_ID=prod_…`.

**Voice:**
> Every checkout sells a product, so let's create one: a SnapKit credit pack for ten dollars.
> We create a client with our key. The SDK works out from the key that this is the sandbox,
> so there's nothing else to configure.
> Look at the price: the amount is the string `"10.00"`, not a number. Bachs always uses
> decimal strings for money, so nothing ever gets rounded on the way.
> And this idempotency key means that if the script runs twice by accident, you still get
> one product, not two.
> Run it, and copy the product ID it prints into `PRODUCT_ID`.

## 4 · The checkout route (2:00–3:15) · per language

**Screen:** editor, typing `server.js` / `app.py` from the top down to the end of the
checkout route. Camera follows the line being typed.

**Voice:**
> Now the server. The store page is ready-made in the `public` folder,
> **[Node]** so Express just serves it.
> **[Python]** so Flask just serves it.
> Its Buy button posts to `/checkout`, and that's the route we write.
> In the checkout route we do three things.
> One: make an order ID. In a real app this is the order you save in your database.
> Two: ask Bachs for a checkout session. The cart is our product, and the reference is
> our order ID, so every payment can be matched back to the order it's for.
> The idempotency key is tied to that same order, so a retry can never create a second
> checkout.
> Three: send the customer to the `checkout_url` Bachs gives back. Bachs hosts the whole
> payment page: cards, bank transfer, and local currencies, so you don't build any of it.

## 5 · Make a test payment (3:15–3:55) · per language for the run command, shared after

**Screen:** terminal: **[Node]** `node server.js` / **[Python]** `flask --app app run --port 3000`.
Browser: `localhost:3000` → **Buy** → the hosted checkout → pay with a test card → paid.

**Voice:**
> Start the server, open it in the browser, and click Buy.
> That's the Bachs checkout, running in the sandbox, so we can pay with a test card.
> Any card number works, apart from a few special ones that simulate a decline. Those
> are listed in the docs.
> One thing you'll notice: there's no "return to your site" link here. Bachs won't send
> customers back to `localhost`, even in the sandbox. In production you add a
> `success_url` that points at your real thank-you page.
> Paid. But here's the question: how does our server know?

## 6 · The mistake everyone makes, and webhooks (3:55–5:15) · per language

**Screen:**
1. Title card: "A redirect isn't proof of payment."
2. Editor: type the `/webhooks` route.
3. Second terminal: `bachs listen --forward-to localhost:3000/webhooks` → it prints a
   `whsec_…` signing secret (masked) → `export BACHS_WEBHOOK_SECRET=whsec_…` → restart the
   server.
4. Pay again in the browser → the CLI prints `✓ checkout.completed … 200` and the server
   prints `Order … paid: 10.00 USD`. Camera holds on that line.

**Voice:**
> The most common mistake is treating the redirect back to your site as proof of payment.
> A customer can close the tab before it happens, or open your success page without
> paying at all.
> The source of truth is a webhook: Bachs calls your server when the payment completes.
> Here's our webhook route.
> **[Node]** The important part: `express.raw`. We need the body exactly as it arrived,
> before anything parses it, because that's what the signature was made from.
> **[Python]** The important part: `request.get_data()`. We need the body exactly as it
> arrived, because that's what the signature was made from.
> `constructEvent` checks the signature with our webhook secret. If someone sends a fake
> request, it fails, and we answer 400.
> When the event is `checkout.completed`, we read the reference, which is our order ID,
> and mark that order as paid.
> To test it locally, the Bachs CLI forwards real sandbox events to your machine. No
> deploying, and no tunnel. It prints a signing secret just for this session; put that in
> `BACHS_WEBHOOK_SECRET`.
> Now pay one more time… and there it is. Bachs signed the event, our server verified it,
> and order paid. That's the moment you fulfil the order.

## 7 · Recap and next (5:15–5:45) · shared

**Screen:** split view of the finished file with each part highlighted in turn, then the
end screen with the next episode and the docs link.

**Voice:**
> That's a complete payment flow: a product, a checkout session tied to your order, the
> hosted checkout, and a verified webhook telling you it's paid.
> In the next episode we make that webhook bulletproof: duplicates, retries, and events
> that arrive out of order.
> The code from this video is linked in the description. See you in the next one.

---

## YouTube details

**Titles**
- Node cut: *Accept your first payment with Bachs (Node.js)*
- Python cut: *Accept your first payment with Bachs (Python)*

**Thumbnail text:** "Your first payment" + a small Node.js or Python label, in the
"Build it with Bachs" style.

**Description** (Node cut; the Python one swaps the language and links):

> Build a complete payment flow with the Bachs Node.js SDK: create a product, start a
> hosted checkout, pay with a test card, and confirm the payment with a verified webhook.
> Everything runs in the Bachs sandbox, so no real money moves.
>
> 0:00 A real payment, start to finish
> 0:15 What you need
> 0:40 Install the SDK and add your key
> 1:15 Create a product
> 2:00 The checkout route
> 3:15 Make a test payment
> 3:55 The mistake everyone makes, and webhooks
> 5:15 Recap and next
>
> Accept a payment guide: https://docs.bachs.io/guides/checkout/checkout-sessions
> Node.js SDK: https://docs.bachs.io/sdks/node
> Test webhooks locally: https://docs.bachs.io/developer-portal/local-testing
> Sandbox and test cards: https://docs.bachs.io/integrate/sandbox
> Get a sandbox key: https://docs.bachs.io/authentication

(Chapter times are placeholders until the cut is locked; they get updated to match.)

---

## Notes for the recording session

- Needs `BACHS_API_KEY` (an `sk_sandbox_` key with `products:write`, `payments:write`,
  `customers:write`) in the environment.
- The CLI (`npm install -g @bachs/cli`) reads `BACHS_API_KEY` from the environment, so
  `bachs listen` works without `bachs login`. Viewers are told to run
  `bachs login --sandbox` instead.
- Keys and webhook secrets are masked on screen with an overlay in the edit, and the
  recorder types them from the environment, never from the script.
- Record with `launch-video/recorder/`: VS Code (code-server) for the editor and
  terminals, plus a second browser tab for `localhost:3000` and the hosted checkout.
- Before recording, run the whole flow once off camera to confirm the hosted checkout
  loads from this environment and `checkout.completed` arrives through `bachs listen`.
