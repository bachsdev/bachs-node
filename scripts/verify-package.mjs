import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const metadataFile = process.argv[3] ?? resolve(root, '.package-check/pack-result.json');
const contentRoot = resolve(process.argv[4] ?? root);
const metadata = JSON.parse(readFileSync(metadataFile, 'utf8'))[0];
const keyFile = process.argv[2];
const key = keyFile ? readFileSync(keyFile, 'utf8').replace(/^\uFEFF/, '').trim() : undefined;
if (keyFile) assert.ok(key, 'Credential scan requires a non-empty key file');
for (const file of metadata.files) {
  assert.ok(file.path === 'package.json' || file.path === 'README.md' || file.path === 'LICENSE' || file.path.startsWith('dist/'), 'Unexpected file in package: ' + file.path);
  const path = resolve(contentRoot, file.path);
  assert.ok(path.startsWith(contentRoot + sep));
  if (key) assert.ok(!readFileSync(path).includes(Buffer.from(key)), 'A credential was detected in package contents; publication is forbidden.');
}
for (const required of ['LICENSE', 'README.md', 'package.json', 'dist/esm/index.js', 'dist/esm/index.d.ts', 'dist/cjs/index.js', 'dist/cjs/index.d.ts', 'dist/cjs/package.json']) assert.ok(metadata.files.some(file => file.path === required), required);
const pkg = JSON.parse(readFileSync(resolve(contentRoot, 'package.json'), 'utf8'));
assert.equal(pkg.name, '@bachs/sdk');
assert.equal(pkg.version, '1.0.0');
assert.equal(pkg.license, 'MIT');
assert.notEqual(pkg.private, true);
console.log(JSON.stringify({ package: metadata.filename, files: metadata.files.length, whitelist_verified: true, credential_scan: key ? 'passed' : 'not-run' }));
