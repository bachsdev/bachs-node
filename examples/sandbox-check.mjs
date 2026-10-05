import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Bachs, BachsApiError } from '../dist/esm/index.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const keyFileIndex = process.argv.indexOf('--key-file');
if (keyFileIndex < 0 || !process.argv[keyFileIndex + 1]) {
  console.error('Supply --key-file with the local path to a plain sandbox key. Never supply a key directly on the command line.');
  process.exitCode = 1;
} else {
  let key;
  try { key = (await readFile(process.argv[keyFileIndex + 1], 'utf8')).replace(/^\uFEFF/, '').trim(); }
  catch { console.error('The local key file could not be read.'); process.exitCode = 1; }
  if (key !== undefined) {
    if (!key || /\s/.test(key)) { console.error('Key file must contain one plain key; contents are not displayed.'); process.exitCode = 1; }
    else {
      const sdk = new Bachs({ apiKey: key, environment: 'sandbox', timeoutMs: 10000 });
      const runId = randomUUID();
      const journal = { run_id: runId, environment: 'sandbox', started_at: new Date().toISOString(), checks: [], operations: {} };
      const output = resolve(root, 'test-results', 'sandbox-' + runId + '.json');
      await mkdir(dirname(output), { recursive: true });
      const save = () => writeFile(output, JSON.stringify(journal, null, 2) + '\n');
      const report = entry => { journal.checks.push(entry); console.log(JSON.stringify(entry)); };
      function safeError(error) {
        return { result: 'failed', error_type: error?.name ?? 'UnknownError', ...(error instanceof BachsApiError ? { http_status: error.status, ...(typeof error.errorCode === 'string' && /^[A-Z0-9_]{1,80}$/.test(error.errorCode) ? { error_code: error.errorCode } : {}) } : {}), outcome_unknown: error?.outcomeUnknown === true };
      }
      async function readCheck(name, operation) {
        try { const result = await operation(); report({ check: name, result: 'passed' }); await save(); return result; }
        catch (error) { report({ check: name, ...safeError(error) }); await save(); process.exitCode = 1; return undefined; }
      }
      const products = await readCheck('products.list', () => sdk.products.list({ limit: 1 }));
      if (products?.items[0]) await readCheck('products.get', () => sdk.products.get(products.items[0].id));
      await readCheck('balances.get', () => sdk.balances.get());
      const payments = await readCheck('payments.list', () => sdk.payments.list({ limit: 1 }));
      if (payments?.items[0]?.id) await readCheck('payments.get', () => sdk.payments.get(payments.items[0].id));
      const subscriptions = await readCheck('subscriptions.list', () => sdk.subscriptions.list({ limit: 1 }));
      if (subscriptions?.items[0]) await readCheck('subscriptions.get', () => sdk.subscriptions.get(subscriptions.items[0].id));
      const payouts = await readCheck('payouts.list', () => sdk.payouts.list({ limit: 1 }));
      if (payouts?.items[0]) await readCheck('payouts.get', () => sdk.payouts.get(payouts.items[0].id));
      const destinations = await readCheck('payoutDestinations.list', () => sdk.payoutDestinations.list({ limit: 1 }));
      if (destinations?.destinations[0]) await readCheck('payoutDestinations.get', () => sdk.payoutDestinations.get(destinations.destinations[0].id));
      await readCheck('banks.list', () => sdk.banks.list({ country: 'NG' }));
      if (process.argv.includes('--create-approved-records') && !process.exitCode) {
        async function writeCheck(name, input, operation, idField) {
          const idempotencyKey = 'sdk-v1-' + runId + '-' + name;
          journal.operations[name] = { idempotency_key: idempotencyKey, input, state: 'sending-unconfirmed' };
          await save();
          try {
            const result = await operation({ idempotencyKey });
            journal.operations[name].state = 'confirmed'; journal.operations[name].id = result[idField];
            report({ check: name, result: 'passed' }); await save(); return result;
          } catch (error) {
            journal.operations[name].state = error?.outcomeUnknown ? 'outcome-unknown-do-not-repeat' : 'rejected-or-not-confirmed';
            report({ check: name, ...safeError(error) }); await save(); process.exitCode = 1; return undefined;
          }
        }
        const productInput = { name: 'SDK V1 sandbox check ' + runId, price: { currency: 'USD', amount: '12.00' }, billing_cycle: { interval: 'month', frequency: 1 } };
        const product = await writeCheck('products.create', productInput, options => sdk.products.create(productInput, options), 'id');
        if (product) {
          const checkoutInput = { product_cart: [{ product_id: product.id }], customer: { email: 'sdk-check-' + runId + '@example.com', name: 'Synthetic SDK Check' }, reference: 'sdk-v1-' + runId };
          const checkout = await writeCheck('checkoutSessions.create', checkoutInput, options => sdk.checkoutSessions.create(checkoutInput, options), 'checkout_id');
          if (checkout) await readCheck('checkoutSessions.get', () => sdk.checkoutSessions.get(checkout.checkout_id));
          if (!process.exitCode) {
            const quoteInput = { from_currency: 'USD', to_currency: 'NGN', amount: '1.00' };
            await writeCheck('payoutQuotes.create', quoteInput, options => sdk.payoutQuotes.create(quoteInput, options), 'quote_id');
          }
        }
      }
      journal.finished_at = new Date().toISOString(); await save();
      console.log('Sanitized results saved locally. No payout, customer charge, cancellation, portal session or destination creation was performed.');
      if (process.exitCode) console.log('Investigate failed checks before any new write. The operation journal preserves planned inputs/keys and uncertain outcomes.');
    }
  }
}
