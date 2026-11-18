// Behaviour checks for the bulk tiers and the cart lock, driven in headless
// Chromium against the Liquid harness. Where check-layout.mjs asks "does it
// fit", this asks "does the order carry the right numbers":
//
//   - the per-magnet note shows the selected tier and follows variant changes
//   - line item properties are written from the selected tier at upload,
//     rewritten on a later variant change, and again at submit
//   - reset strips them and a second upload writes fresh ones
//   - pack products are untouched: no note, fixed magnets per unit
//   - in the cart, pack and bulk lines lock and a plain product keeps its stepper
//
// The upload itself is not driven - the core's photosUploaded event is
// dispatched with the detail it would carry - so nothing touches Cloudinary.
//
//   npm run check-tiers
//
// Needs the same Chromium setup as check-layout.mjs (see tools/README.md).

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const TOOLS = path.dirname(fileURLToPath(import.meta.url));
const LIB = path.join(TOOLS, '.chromium-libs', 'root', 'usr', 'lib', 'x86_64-linux-gnu');
if (fs.existsSync(LIB)) process.env.LD_LIBRARY_PATH = LIB + (process.env.LD_LIBRARY_PATH ? ':' + process.env.LD_LIBRARY_PATH : '');

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.error('\n  playwright is not installed.\n    cd tools && npm install\n    npx playwright install chromium\n');
  process.exit(1);
}

const PORT = 8792;
const BASE = `http://127.0.0.1:${PORT}`;
const server = spawn(process.execPath, [path.join(TOOLS, 'serve.mjs'), '--port', String(PORT)], { stdio: 'ignore' });
for (let i = 0; i < 50; i++) { try { await fetch(BASE + '/'); break; } catch { await new Promise(r => setTimeout(r, 200)); } }

const results = [];
const check = (label, cond, detail = '') => { results.push(`${cond ? 'PASS' : 'FAIL'}  ${label}${cond ? '' : '  ' + detail}`); if (!cond) process.exitCode = 1; };

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const read = () => page.evaluate(() => ({
    each: document.querySelector('.bulk-tier-note [data-each]')?.textContent,
    magnets: document.querySelector('.bulk-tier-note [data-magnets]')?.textContent,
    props: Object.fromEntries([...document.querySelectorAll('#test-product-form input[name^="properties["]')].map(i => [i.name.slice(11, -1), i.value])),
    addDisabled: document.querySelector('button[name="add"]').disabled,
  }));
  const upload = (detail) => page.evaluate(d => document.dispatchEvent(new CustomEvent('photosUploaded', { detail: d })), detail);

  await page.goto(`${BASE}/bulk-rectangle`);
  let s = await read();
  check('initial note shows the first tier', s.each === '$6.33' && s.magnets === '30', JSON.stringify(s));
  check('add to cart disabled before upload', s.addDisabled === true);

  await page.selectOption('select[name="id"]', 'bulk-rect-test-v120');
  s = await read();
  check('note follows a variant change', s.each === '$5.67' && s.magnets === '120', JSON.stringify(s));
  check('no properties before upload', Object.keys(s.props).length === 0, JSON.stringify(s.props));

  await upload({ sessionId: 'S1', productId: 'bulk-rect-test', variant: 'bulk-rectangle', photoCount: 1, magnetsPerUnit: 30, packNumber: 1 });
  s = await read();
  check('properties come from the selected tier, not the init constant',
    s.props._magnets_per_unit === '120' && s.props.Photos === '1 photo, printed on 120 magnets', JSON.stringify(s.props));
  check('add to cart enabled after upload', s.addDisabled === false);

  await page.selectOption('select[name="id"]', 'bulk-rect-test-v300');
  s = await read();
  check('properties follow a later variant change',
    s.props._magnets_per_unit === '300' && s.props.Photos === '1 photo, printed on 300 magnets', JSON.stringify(s.props));
  check('session properties intact', s.props._session_id === 'S1' && s.props._photo_count === '1' && s.props._pack_number === '1', JSON.stringify(s.props));
  check('replacement url carries the session', (s.props._replacement_url || '').includes('session=S1'), s.props._replacement_url);

  // Change the variant silently (no change event), then submit: capture must catch up.
  await page.evaluate(() => { document.querySelector('select[name="id"]').value = 'bulk-rect-test-v60'; document.querySelector('#test-product-form').requestSubmit(); });
  s = await read();
  check('submit rewrites properties from the form state', s.props._magnets_per_unit === '60', JSON.stringify(s.props));

  await page.evaluate(() => document.dispatchEvent(new CustomEvent('photosReset', { detail: { productId: 'bulk-rect-test' } })));
  s = await read();
  check('reset strips properties and re-locks', Object.keys(s.props).length === 0 && s.addDisabled === true, JSON.stringify(s));

  await upload({ sessionId: 'S3', productId: 'bulk-rect-test', variant: 'bulk-rectangle', photoCount: 1, magnetsPerUnit: 30, packNumber: 2 });
  s = await read();
  check('a second upload after reset writes fresh properties', s.props._session_id === 'S3' && s.props._pack_number === '2' && s.props._magnets_per_unit === '60', JSON.stringify(s.props));

  await page.goto(`${BASE}/square`);
  await upload({ sessionId: 'S2', productId: 'square-test', variant: 'square', photoCount: 9, magnetsPerUnit: 9, packNumber: 1 });
  const p = await page.evaluate(() => ({
    note: !!document.querySelector('.bulk-tier-note'),
    props: Object.fromEntries([...document.querySelectorAll('#test-product-form input[name^="properties["]')].map(i => [i.name.slice(11, -1), i.value])),
  }));
  check('pack page has no tier note and keeps 9 magnets',
    p.note === false && p.props._magnets_per_unit === '9' && p.props.Photos === '9 photos, one set per pack', JSON.stringify(p));

  await page.goto(`${BASE}/cart`);
  await page.waitForFunction(() => [...document.querySelectorAll('quantity-input')].every(q => q.hasAttribute('data-cart-qty-checked')), null, { timeout: 5000 });
  const c = await page.evaluate(() => [...document.querySelectorAll('quantity-input')].map(q => ({
    verdict: q.getAttribute('data-cart-qty-checked'),
    visible: getComputedStyle(q).visibility,
    fixed: q.parentNode.querySelector('.cart-qty-fixed')?.textContent ?? null,
  })));
  check('cart: pack line locked', c[0].verdict === 'locked' && c[0].visible === 'hidden' && c[0].fixed === '1', JSON.stringify(c[0]));
  check('cart: bulk line locked', c[1].verdict === 'locked' && c[1].visible === 'hidden' && c[1].fixed === '1', JSON.stringify(c[1]));
  check('cart: plain product keeps its stepper', c[2].verdict === 'open' && c[2].visible === 'visible' && c[2].fixed === null, JSON.stringify(c[2]));

  check('no page errors', errors.length === 0, errors.join(' | '));
} finally {
  await browser.close();
  server.kill();
}
console.log('\n  Tier and cart-lock checks against the Liquid-rendered pages\n');
console.log(results.map(r => '  ' + r).join('\n'));
console.log(process.exitCode ? '\n  FAILED\n' : '\n  all tier checks passed\n');
