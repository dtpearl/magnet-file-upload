// Renders theme/snippets/*.liquid locally, with no Shopify store involved.
//
// Used two ways:
//   - as a library by serve.mjs, which re-renders on every request so a saved
//     edit shows up on refresh
//   - as a CLI to write static files:  node render.mjs --all --out ../dist

import { Liquid } from 'liquidjs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';
import { VARIANTS, productFor, CART } from './fixtures.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const SNIPPETS = path.join(HERE, '..', 'theme', 'snippets');

export const engine = new Liquid({
  root: SNIPPETS,
  extname: '.liquid',
  // Shopify errors loudly on a missing snippet rather than rendering a blank,
  // so surface it here too instead of silently producing an empty page.
  strictFilters: true,
  // Off by default, but pinned: with it on, serve.mjs would keep serving the
  // parse from first request and a saved edit would not show on refresh.
  cache: false,
});

// A minimal product page. Deliberately not a theme: just enough chrome for the
// snippets to attach to, so anything that breaks here is the snippets' doing.
function page({ title, body, nav = '', note = '' }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <style>
      * { box-sizing: border-box; }
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
             margin: 0; padding: 24px 16px 64px; background: #fff; color: #333; }
      .harness-bar { background: #fff7e0; border-bottom: 1px solid #f0d59b; color: #805400;
                     padding: 10px 16px; font-size: 13px; text-align: center;
                     margin: -24px -16px 24px; }
      .harness-bar a { color: #805400; margin: 0 6px; }
      .harness-note { max-width: 900px; margin: 0 auto 20px; padding: 10px 14px;
                      border: 1px dashed #c9bdb0; border-radius: 8px; font-size: 13px; color: #6b7280; }
      .harness-form { max-width: 900px; margin: 0 auto 24px; padding: 12px 16px;
                      border: 1px dashed #c9bdb0; border-radius: 8px; display: flex;
                      align-items: center; gap: 12px; flex-wrap: wrap; }
      .stage { max-width: 900px; margin: 0 auto; }
    </style>
  </head>
  <body>
    <div class="harness-bar">Local Liquid harness - rendered from theme/snippets, no Shopify. ${nav}</div>
    ${note ? `<div class="harness-note">${note}</div>` : ''}
    <div class="stage">${body}</div>
  </body>
</html>
`;
}

const nav = () =>
  ['<a href="/">index</a>', ...Object.keys(VARIANTS).map(k => `<a href="/${k}">${k}</a>`),
   '<a href="/cart">cart</a>', '<a href="/replacement">replacement</a>'].join('');

// Stand-in for the Shopify product form. cart-button-control looks for
// [name="add"] inside a form near .file-upload-container.
const PRODUCT_FORM = `
  <div class="harness-form">
    <form id="test-product-form" class="product-form" onsubmit="return false">
      <button type="submit" class="product-form__submit" name="add">Add to cart</button>
    </form>
    <span style="font-size:12px;color:#6b7280">Stand-in Shopify product form.</span>
  </div>`;

export async function renderVariant(key) {
  const product = productFor(key);
  const body = PRODUCT_FORM + (await engine.renderFile('photo-upload', { product }));
  return page({
    title: `${VARIANTS[key].label} - Liquid harness`,
    body,
    nav: nav(),
    note: `<strong>${VARIANTS[key].label}</strong> - ${VARIANTS[key].blurb}.
           Rendered via <code>{% render 'photo-upload', product: product %}</code>
           with <code>image_uploader_shape = ${VARIANTS[key].shape}</code>.`,
  });
}

export async function renderCart() {
  const body = await engine.renderFile('cart-quantity-control', { cart: CART });
  return page({
    title: 'Cart - Liquid harness',
    nav: nav(),
    note: `Cart snippet. The stepper is hidden on line items whose
           <code>_photo_count</code> is above 1; bulk and non-photo products keep theirs.`,
    body: body + CART.items.map(i => `
      <div style="border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin:8px 0">
        <strong>${i.title}</strong> - _photo_count: ${i.properties._photo_count ?? '(none)'}
        <quantity-input class="quantity" style="display:block;margin-top:8px">
          <button name="minus" type="button">-</button>
          <input class="quantity__input" type="number" value="${i.quantity}" min="0" />
          <button name="plus" type="button">+</button>
        </quantity-input>
      </div>`).join(''),
  });
}

export async function renderReplacement() {
  return page({
    title: 'Replacement - Liquid harness',
    nav: nav(),
    note: `Replacement page. It reads <code>session</code>, <code>product</code> and
           <code>variant</code> from the query string and redirects to / without them, so
           this harness sets <code>Shopify.designMode</code> to hold it in place. Slots stay
           empty unless the session points at real Cloudinary uploads.`,
    body: `<script>window.Shopify = window.Shopify || {}; window.Shopify.designMode = true;</script>`
      + (await engine.renderFile('photo-upload-replacement', {})),
  });
}

export async function renderIndex() {
  const rows = Object.entries(VARIANTS).map(([k, v]) =>
    `<li><a href="/${k}"><strong>${v.label}</strong></a> - ${v.blurb}</li>`).join('');
  return page({
    title: 'Liquid harness',
    nav: nav(),
    body: `<h1>Local Liquid harness</h1>
      <p>Every page below is rendered from <code>theme/snippets/*.liquid</code> on request.
         Save a snippet, refresh, see the change - nothing is uploaded to Shopify.</p>
      <ul>${rows}</ul>
      <ul><li><a href="/cart">Cart</a> - quantity control</li>
          <li><a href="/replacement">Replacement</a> - replacement page</li></ul>`,
  });
}

export const ROUTES = {
  '/': renderIndex,
  '/cart': renderCart,
  '/replacement': renderReplacement,
  ...Object.fromEntries(Object.keys(VARIANTS).map(k => [`/${k}`, () => renderVariant(k)])),
};

// CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const outIdx = args.indexOf('--out');
  const out = outIdx === -1 ? null : args[outIdx + 1];
  if (args.includes('--all')) {
    if (!out) { console.error('--all needs --out <dir>'); process.exit(1); }
    await fs.mkdir(out, { recursive: true });
    for (const [route, fn] of Object.entries(ROUTES)) {
      const name = route === '/' ? 'index' : route.slice(1);
      await fs.writeFile(path.join(out, `${name}.html`), await fn());
      console.log(`wrote ${path.join(out, `${name}.html`)}`);
    }
  } else {
    const key = args[0] || 'square';
    process.stdout.write(await renderVariant(key));
  }
}
