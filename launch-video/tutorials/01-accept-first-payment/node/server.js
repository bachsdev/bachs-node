import express from 'express';
import { randomUUID } from 'node:crypto';
import { Bachs, webhooks } from '@bachs/sdk';

const bachs = new Bachs({ apiKey: process.env.BACHS_API_KEY });
const app = express();

app.get('/', (req, res) => {
  res.send('<form method="post" action="/checkout"><button>Buy credits ($10)</button></form>');
});

app.post('/checkout', async (req, res) => {
  const orderId = randomUUID();
  const checkout = await bachs.checkoutSessions.create(
    { product_cart: [{ product_id: process.env.PRODUCT_ID }], reference: orderId },
    { idempotencyKey: `checkout-${orderId}` },
  );
  res.redirect(303, checkout.checkout_url);
});

app.post('/webhooks', express.raw({ type: '*/*' }), (req, res) => {
  let event;
  try {
    event = webhooks.constructEvent(req.body, req.headers, process.env.BACHS_WEBHOOK_SECRET);
  } catch {
    return res.status(400).send('Invalid signature');
  }
  if (event.type === 'checkout.completed') {
    const { reference, amount, currency } = event.data;
    console.log(`Order ${reference} paid: ${amount} ${currency}`);
  }
  res.sendStatus(200);
});

app.listen(3000, () => console.log('SnapKit running on http://localhost:3000'));
