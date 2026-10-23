import { Bachs } from '@bachs/sdk';

const bachs = new Bachs({ apiKey: process.env.BACHS_API_KEY });

const product = await bachs.products.create(
  { name: 'SnapKit Credit Pack', price: { currency: 'USD', amount: '10.00' } },
  { idempotencyKey: 'create-snapkit-credit-pack' },
);

console.log(product.id);
