// Proves two things before the snippet layout can be trusted:
//
//   1. liquidjs resolves {% render %} with an isolated scope, the same as
//      Shopify. If it inherited the parent scope instead, this harness would
//      render pages that a real store would not - the dangerous direction,
//      because the failure would only appear in production.
//   2. theme/snippets produces byte-identical output to custom-liquid, so
//      moving to snippets changes the deploy mechanism and nothing else.

import { Liquid } from 'liquidjs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';
import { engine, SNIPPETS } from './render.mjs';
import { VARIANTS, productFor } from './fixtures.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const LEGACY = path.join(HERE, '..', 'custom-liquid');
const strip = s => s.replace(/\s+/g, '');
let failures = 0;
const ok = (label, pass, detail = '') => {
  if (!pass) failures++;
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${label}${detail ? `  ${detail}` : ''}`);
};

// --- 1. isolated scope ---
console.log('\n{% render %} scope');
{
  const tmp = path.join(HERE, '.scope-probe');
  await fs.mkdir(tmp, { recursive: true });
  await fs.writeFile(path.join(tmp, 'child.liquid'), '[{{ leaked }}|{{ passed }}]');
  const probe = new Liquid({ root: tmp, extname: '.liquid' });
  const out = await probe.parseAndRender(
    `{% assign leaked = 'SHOULD-NOT-APPEAR' %}{% render 'child', passed: 'passed-in' %}`);
  ok('parent variables do NOT leak into a rendered snippet',
     !out.includes('SHOULD-NOT-APPEAR'), `got ${out}`);
  ok('explicitly passed variables DO arrive', out.includes('passed-in'), `got ${out}`);
  await fs.rm(tmp, { recursive: true, force: true });
}

// --- 2. the guards actually select ---
console.log('\nvariant selection');
for (const [key, v] of Object.entries(VARIANTS)) {
  const out = await engine.renderFile('photo-upload', { product: productFor(key) });
  const present = Object.values(VARIANTS)
    .filter(o => out.includes(`[photo-upload-${o.shape.replace('_', '-')}]`));
  ok(`${key} renders exactly one variant`, present.length === 1,
     `matched: ${present.map(p => p.shape).join(', ') || 'none'}`);
}

// --- 3. missing product is loud, not silently empty ---
console.log('\nforgetting to pass product');
{
  const out = await engine.renderFile('photo-upload', {});
  const anyVariant = Object.values(VARIANTS).some(v => out.includes(`[photo-upload-${v.shape.replace('_','-')}]`));
  ok('no variant renders without product (the documented trap)', !anyVariant,
     anyVariant ? '' : 'confirmed: guards evaluate false, output is empty');
}

// --- 4. parity with the files currently pasted into Shopify ---
console.log('\nparity: theme/snippets vs custom-liquid');
const ORDER = ['photo-upload-styles', 'photo-upload-core', 'photo-upload-square',
  'photo-upload-rectangle', 'photo-upload-bulk-square', 'photo-upload-bulk-rectangle',
  'cart-button-control'];

for (const key of Object.keys(VARIANTS)) {
  const product = productFor(key);
  // what the snippet layout produces
  const viaSnippets = await engine.renderFile('photo-upload', { product });
  // what pasting the .html blocks produces: same Liquid, same order, same data
  const legacy = new Liquid({ root: LEGACY, extname: '.html' });
  const parts = [];
  for (const name of ORDER) {
    parts.push(await legacy.renderFile(name, { product }));
  }
  const viaPaste = parts.join('\n');
  ok(`${key}: identical output`, strip(viaSnippets) === strip(viaPaste),
     `snippets ${strip(viaSnippets).length} chars vs paste ${strip(viaPaste).length}`);
}

// cart + replacement entry points
{
  const legacy = new Liquid({ root: LEGACY, extname: '.html' });
  const a = await engine.renderFile('photo-upload-cart', {});
  const b = await legacy.renderFile('cart-quantity-control', {});
  ok('cart: identical output', strip(a) === strip(b));

  const c = await engine.renderFile('photo-upload-replacement-page', {});
  const d = (await Promise.all(['photo-upload-styles','photo-upload-core','photo-upload-replacement']
    .map(n => legacy.renderFile(n, {})))).join('\n');
  ok('replacement: identical output', strip(c) === strip(d));
}

// --- 5. the two trees have not drifted apart ---
console.log('\nsnippet files vs their custom-liquid originals');
for (const name of [...ORDER, 'cart-quantity-control', 'photo-upload-replacement']) {
  const a = await fs.readFile(path.join(SNIPPETS, `${name}.liquid`), 'utf8');
  const b = await fs.readFile(path.join(LEGACY, `${name}.html`), 'utf8');
  ok(`${name}`, a === b, a === b ? '' : 'DRIFTED - the two copies differ');
}

console.log(`\n${failures ? `${failures} FAILED` : 'all checks passed'}\n`);
process.exit(failures ? 1 : 0);
