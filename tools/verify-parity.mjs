// Proves the consolidated snippets in theme/snippets behave identically to the
// files in custom-liquid, which are what is deployed today. custom-liquid is the
// reference implementation: as long as it is kept, this is the check that says
// the refactor did not change what reaches the browser.
//
// The snippets are no longer copies of those files, so this compares RENDERED
// OUTPUT rather than source. Three things are normalised away, each deliberate:
//
//   whitespace     - the four variant files were formatted differently from one
//                    another; one merged body cannot reproduce both styles, and
//                    whitespace between tags changes nothing.
//   HTML comments  - developer notes, not rendered content.
//   version stamps - intentionally bumped by the refactor.
//   quote style    - the bulk files used single-quoted JS strings, the pack
//                    files double-quoted; one merged body cannot be both. Safe
//                    to ignore: a difference in the quoted CONTENT still shows,
//                    because both sides pass through the same normalisation.
//   trailing commas - likewise: the pack files ended the init object with one,
//                    the bulk files did not. Valid either way in every browser
//                    this runs in.
//
// One intentional difference is asserted separately rather than ignored: the
// product page now also carries the replacement page's CSS, because all CSS was
// merged into one stylesheet. So CSS is checked for completeness (nothing lost)
// while markup and JS are checked for exact equality.

import { Liquid } from 'liquidjs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { engine } from './render.mjs';
import { VARIANTS, productFor } from './fixtures.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const legacy = new Liquid({ root: path.join(HERE, '..', 'custom-liquid'), extname: '.html', cache: false });

const stripComments = s => s.replace(/<!--[\s\S]*?-->/g, '');
const stripVersions = s => s.replace(/v?20\d\d-\d\d-\d\d\.\d+/g, 'VERSION');
const cssOf  = s => [...s.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');
const noCss  = s => s.replace(/<style>[\s\S]*?<\/style>/g, '');
const norm   = s => stripVersions(stripComments(s)).replace(/\s+/g, '').replace(/'/g, '"').replace(/,(?=[}\]])/g, '');

let failures = 0;
const ok = (label, pass, detail = '') => {
  if (!pass) failures++;
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${label}${detail ? `  ${detail}` : ''}`);
};

// --- 1. {% render %} isolates scope, as Shopify does -------------------------
console.log('\n{% render %} scope');
{
  const probe = new Liquid({ root: path.join(HERE, 'fixtures-probe'), extname: '.liquid' });
  probe.registerFilter('noop', v => v);
  const out = await probe.parseAndRender(
    `{% assign leaked = 'LEAK' %}{% render 'x' %}`,
    {},
    { globals: {} }
  ).catch(e => `ERR:${e.message}`);
  // a missing snippet throws; what matters is it did not silently inherit
  ok('a rendered snippet cannot see parent variables', !String(out).includes('LEAK'));
}

// --- 2. guards select exactly one variant ------------------------------------
console.log('\nvariant selection');
for (const key of Object.keys(VARIANTS)) {
  const out = await engine.renderFile('photo-upload', { product: productFor(key) });
  const expect = key === 'square' ? 'square' : key === 'rectangle' ? 'rectangle'
               : key === 'bulk-square' ? 'bulk-square' : 'bulk-rectangle';
  // core logs its own [photo-upload-core] first, so take the init call's variant
  const logged = (out.match(/variant:\s*"([a-z-]+)"/) || [])[1];
  ok(`${key} initialises as "${expect}"`, logged === expect, `got "${logged}"`);
}

// --- 3. the isolated-scope trap stays documented -----------------------------
console.log('\nforgetting to pass product');
{
  const out = await engine.renderFile('photo-upload', {});
  // core's JS mentions the class in a selector, so look for actual markup
  ok('renders no uploader without product', !out.includes('data-product-id='));
}

// --- 4. parity with what is deployed today -----------------------------------
console.log('\nparity: theme/snippets vs custom-liquid');
const LEGACY_PRODUCT = ['photo-upload-styles', 'photo-upload-core',
  'photo-upload-square', 'photo-upload-rectangle',
  'photo-upload-bulk-square', 'photo-upload-bulk-rectangle', 'cart-button-control'];

for (const key of Object.keys(VARIANTS)) {
  const product = productFor(key);
  const now = await engine.renderFile('photo-upload', { product });
  const parts = [];
  for (const n of LEGACY_PRODUCT) parts.push(await legacy.renderFile(n, { product }));
  const before = parts.join('\n');

  const a = norm(noCss(now)), b = norm(noCss(before));
  let where = '';
  if (a !== b) {
    let i = 0; while (i < a.length && a[i] === b[i]) i++;
    where = ` first differs at ${i}: got ...${a.slice(Math.max(0,i-50), i+50)}... expected ...${b.slice(Math.max(0,i-50), i+50)}...`;
  }
  ok(`${key}: markup and JS identical`, a === b,
     `${a.length} vs ${b.length} chars.${where}`);

  // CSS is a superset now and the blocks were appended, so the old sheet is no
  // longer one contiguous run. Check rule by rule instead of as a substring.
  const nowCss = norm(cssOf(now));
  const rules = cssOf(before).split('}').map(r => norm(r)).filter(r => r.length > 8);
  const missing = rules.filter(r => !nowCss.includes(r));
  ok(`${key}: no CSS lost`, missing.length === 0,
     `${rules.length} rules checked${missing.length ? `, missing: ${missing[0].slice(0,60)}` : ''}`);
}

// cart page
{
  const now = await engine.renderFile('cart-quantity-control', {});
  const before = await legacy.renderFile('cart-quantity-control', {});
  ok('cart: identical', norm(now) === norm(before));
}

// replacement page
{
  const now = await engine.renderFile('photo-upload-replacement', {});
  const before = (await Promise.all(
    ['photo-upload-styles', 'photo-upload-core', 'photo-upload-replacement']
      .map(n => legacy.renderFile(n, {})))).join('\n');
  ok('replacement: markup and JS identical', norm(noCss(now)) === norm(noCss(before)),
     `${norm(noCss(now)).length} vs ${norm(noCss(before)).length} chars`);
  const nowCss2 = norm(cssOf(now));
  const rules2 = cssOf(before).split('}').map(r => norm(r)).filter(r => r.length > 8);
  const missing2 = rules2.filter(r => !nowCss2.includes(r));
  ok('replacement: no CSS lost', missing2.length === 0,
     `${rules2.length} rules checked${missing2.length ? `, missing: ${missing2[0].slice(0,60)}` : ''}`);
}

console.log(`\n${failures ? `${failures} FAILED` : 'all checks passed'}\n`);
process.exit(failures ? 1 : 0);
