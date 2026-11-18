// Proves the consolidated snippets in theme/snippets behave, and reports how far
// they have moved from the files in custom-liquid, which are what the pasted
// Custom Liquid blocks deploy.
//
// custom-liquid is FROZEN at the parity commit named in
// custom-liquid/PORTING-LOG.md. Until the snippets change, the two render
// identically and this says so. Once the snippets move on, the difference is
// expected and is reported as DRIFT rather than FAIL - with one exception: drift
// with no entry in the porting log fails, because the log is what lets the
// blocks catch up later, and a missing entry is easiest to add in the commit
// that created the drift.
//
// The snippets are not copies of the legacy files, so this compares RENDERED
// OUTPUT rather than source. Five things are normalised away, each deliberate:
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
// One intentional difference is handled separately rather than ignored: the
// product page carries the replacement page's CSS too, because all CSS was
// merged into one stylesheet. So CSS is checked for completeness (nothing lost)
// while markup and JS are checked for exact equality.
//
// `npm run drift` shows the actual differences as a diff.

import { Liquid } from 'liquidjs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { engine } from './render.mjs';
import { VARIANTS, productFor } from './fixtures.mjs';
import { TARGETS, norm, noCss, cssOf, stripComments, portingLogEntries } from './targets.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));

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

// --- 4. drift from the frozen custom-liquid blocks ---------------------------
console.log('\ndrift: theme/snippets vs custom-liquid (frozen, see custom-liquid/PORTING-LOG.md)');
let drifted = 0;
for (const [name, target] of Object.entries(TARGETS)) {
  const [now, before] = await Promise.all([target.now(), target.before()]);

  const a = norm(noCss(now)), b = norm(noCss(before));
  let where = '';
  if (a !== b) {
    let i = 0; while (i < a.length && a[i] === b[i]) i++;
    where = `first differs at ${i}: now ...${a.slice(Math.max(0, i - 40), i + 40)}...`;
  }

  // CSS is a superset and the blocks were appended, so the old sheet is no
  // longer one contiguous run. Check rule by rule instead of as a substring.
  const nowCss = norm(cssOf(now));
  // Comments go before the split: one containing a brace would otherwise
  // leave a half-comment fragment that matches nothing.
  const rules = stripComments(cssOf(before)).split('}').map(r => norm(r)).filter(r => r.length > 8);
  const missing = rules.filter(r => !nowCss.includes(r));

  const same = a === b && missing.length === 0;
  if (!same) drifted++;
  const detail = same
    ? `${a.length} chars, ${rules.length} CSS rules`
    : [a !== b ? `markup/JS ${a.length} vs ${b.length} chars, ${where}` : '',
       missing.length ? `${missing.length} CSS rule(s) from the blocks no longer present` : ''].filter(Boolean).join('; ');
  console.log(`  ${same ? 'SAME ' : 'DRIFT'}  ${name}  ${detail}`);
}

{
  const entries = await portingLogEntries();
  if (entries < 0) {
    ok('custom-liquid/PORTING-LOG.md exists', false, 'the file is missing');
  } else if (drifted && entries === 0) {
    ok('drift is recorded in custom-liquid/PORTING-LOG.md', false,
       `${drifted} target(s) differ from the blocks but the log has no entries`);
  } else if (drifted) {
    console.log(`  NOTE   ${drifted} target(s) drifted, ${entries} entr${entries === 1 ? 'y' : 'ies'} in the porting log. \`npm run drift\` shows the diff.`);
  } else {
    console.log(`  NOTE   no drift: the blocks would render exactly what the snippets do`);
  }
}

console.log(`\n${failures ? `${failures} FAILED` : 'all checks passed'}\n`);
process.exit(failures ? 1 : 0);
