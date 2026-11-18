// The things verify-parity.mjs and drift.mjs compare: each target renders the
// same page from theme/snippets ("now") and from custom-liquid ("before").
// custom-liquid is frozen at the parity commit named in
// custom-liquid/PORTING-LOG.md, so "before" is what the pasted blocks deploy.

import { Liquid } from 'liquidjs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';
import { engine } from './render.mjs';
import { VARIANTS, productFor } from './fixtures.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const LEGACY_DIR = path.join(HERE, '..', 'custom-liquid');
export const PORTING_LOG = path.join(LEGACY_DIR, 'PORTING-LOG.md');

export const legacy = new Liquid({ root: LEGACY_DIR, extname: '.html', cache: false });

// The blocks a product template carries, in paste order.
const LEGACY_PRODUCT = ['photo-upload-styles', 'photo-upload-core',
  'photo-upload-square', 'photo-upload-rectangle',
  'photo-upload-bulk-square', 'photo-upload-bulk-rectangle', 'cart-button-control'];

const joinLegacy = async (names, ctx) =>
  (await Promise.all(names.map(n => legacy.renderFile(n, ctx)))).join('\n');

// Pages. drift.mjs diffs these without their <style> blocks, because the
// product page deliberately carries the replacement page's CSS as well (all CSS
// was merged into one sheet) and that would show as drift on every page. The
// cart snippet is standalone with its own small sheet, so it keeps its CSS.
export const TARGETS = {
  ...Object.fromEntries(Object.keys(VARIANTS).map(key => [key, {
    now: () => engine.renderFile('photo-upload', { product: productFor(key) }),
    before: () => joinLegacy(LEGACY_PRODUCT, { product: productFor(key) }),
  }])),
  cart: {
    now: () => engine.renderFile('cart-quantity-control', {}),
    before: () => legacy.renderFile('cart-quantity-control', {}),
  },
  replacement: {
    now: () => engine.renderFile('photo-upload-replacement', {}),
    before: () => joinLegacy(['photo-upload-styles', 'photo-upload-core', 'photo-upload-replacement'], {}),
  },
};

// Every page target loses its CSS when diffed, except these.
export const PAGE_TARGETS_WITH_OWN_CSS = new Set(['cart']);

// The CSS on its own: the one merged sheet, as the product page renders it,
// against the union of the blocks' sheets in the order they were appended.
export const STYLES = {
  now: async () => cssOf(await engine.renderFile('photo-upload', { product: productFor('square') })),
  before: async () => cssOf(await joinLegacy(['photo-upload-styles', 'photo-upload-replacement', 'cart-button-control'], {})),
};

// Differences the consolidation introduced on purpose, documented in
// verify-parity.mjs. Both sides pass through the same functions, so a change
// to quoted CONTENT or to a real token still shows.
// HTML and CSS comments alike: developer notes, not content.
export const stripComments = s => s.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
export const stripVersions = s => s.replace(/v?20\d\d-\d\d-\d\d\.\d+/g, 'VERSION');
export const cssOf  = s => [...s.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');
export const noCss  = s => s.replace(/<style>[\s\S]*?<\/style>/g, '');
export const norm   = s => stripVersions(stripComments(s))
  .replace(/\s+/g, '').replace(/'/g, '"').replace(/,(?=[}\]])/g, '');

// Entries recorded under "## Entries" in the porting log. Only headings after
// that marker count, so the format example higher up is not mistaken for one.
export async function portingLogEntries() {
  let text;
  try { text = await fs.readFile(PORTING_LOG, 'utf8'); } catch { return -1; }
  const idx = text.indexOf('\n## Entries');
  if (idx === -1) return 0;
  return (text.slice(idx).match(/^### /gm) || []).length;
}
