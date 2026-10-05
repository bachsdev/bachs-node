import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const compiler = resolve(root, 'node_modules/typescript/bin/tsc');
for (const config of ['tsconfig.cjs.json', 'tsconfig.esm.json']) {
  const result = spawnSync(process.execPath, [compiler, '-p', config], { cwd: root, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
mkdirSync(resolve(root, 'dist/esm'), { recursive: true });
writeFileSync(resolve(root, 'dist/cjs/package.json'), JSON.stringify({ type: 'commonjs' }) + '\n');
const names = ['Bachs', 'BachsError', 'BachsApiError', 'BachsNetworkError', 'BachsTimeoutError', 'BachsAbortError', 'BachsResponseError', 'BachsConfigError', 'BachsWebhookError', 'webhooks'];
// Both module entry points use the same classes, including instanceof identity.
writeFileSync(resolve(root, 'dist/esm/index.js'), "import sdk from '../cjs/index.js';\nexport const { " + names.join(', ') + " } = sdk;\n");
