# magnet-file-upload

Self-hosted Custom Liquid snippets for the photo-upload and replacement flow on
luxmagnetco.myshopify.com.

## Repository layout

| Path | What it is |
| --- | --- |
| `custom-liquid/` | The blocks as deployed today, pasted by hand into Custom Liquid sections. Still the live approach. |
| `theme/snippets/` | The same code as theme snippets, rendered with `{% render %}`. Not deployed yet. |
| `tools/` | Local Liquid harness — render and test the snippets with no Shopify store. See [tools/README.md](tools/README.md). |

Both trees are kept byte-identical; `cd tools && npm run verify` checks that and
fails if they drift.

## Two ways to deploy

**Today — Custom Liquid blocks.** Each file in `custom-liquid/` is pasted into a
Custom Liquid section. The snag is that most go into *two* product templates, so
every change has to be applied twice, carefully.

**Ready when you are — theme snippets.** Copy `theme/snippets/*.liquid` into the
theme's `snippets/` folder (Online Store → Themes → ⋯ → Edit code; duplicate the
theme first and publish once it previews cleanly). Each template then holds one
line:

| Template | Line |
| --- | --- |
| Both product templates | `{% render 'photo-upload', product: product %}` |
| Cart template, above the items | `{% render 'photo-upload-cart' %}` |
| Replacement page | `{% render 'photo-upload-replacement-page' %}` |

A change to a snippet then reaches both product templates with no re-pasting.

> **`{% render %}` has an isolated scope.** Unlike the deprecated `{% include %}`
> it does not inherit the parent's variables, so `product` must be passed in and
> threaded down — the wrappers already do this. Omit it and the metafield guards
> quietly evaluate false: no output, no error, nothing to tell you why. There is
> a regression test for exactly this in `npm run verify`.

Once on snippets the 50 KB ceiling stops applying — it is a limit on the Custom
Liquid *setting value*, not on theme files — so the replacement flow that was
split out of core to fit it could be recombined. Confirm the theme file limit
before relying on that.

## Local testing

    cd tools
    npm install
    npm run dev        # http://127.0.0.1:8080

Renders `theme/snippets` on every request, so editing a snippet and refreshing is
the whole loop — nothing is uploaded to Shopify. `npm run verify` proves the
snippets match `custom-liquid/`; `npm run check` drives the upload flow across 10
viewports in headless Chromium. Details in [tools/README.md](tools/README.md).

`custom-liquid/test.html` still tests the pasted blocks, but it carries a
hand-maintained copy of the shared CSS that has to be updated alongside
`photo-upload-styles.html`. The `tools/` harness has no such copy.

## Deployed-snippet versions

When updating a Custom Liquid section in Shopify, compare the `Version:` line at
the top of the pasted block against the version listed here. If they match, the
section is up to date.

> **Keep this table in sync.** Whenever you bump a snippet's `Version:` line (and,
> for `photo-upload-core.html`, its `console.log` version), update the matching
> row below in the same commit. The table is the source of truth for what's
> deployed, so a stale row means a snippet silently goes un-redeployed.

| File | Current version |
| --- | --- |
| [cart-button-control.html](custom-liquid/cart-button-control.html) | 2026-08-13.1 |
| [cart-quantity-control.html](custom-liquid/cart-quantity-control.html) | 2026-08-13.1 |
| [photo-upload-styles.html](custom-liquid/photo-upload-styles.html) | 2026-09-11.5 |
| [photo-upload-core.html](custom-liquid/photo-upload-core.html) | 2026-09-11.1 |
| [photo-upload-square.html](custom-liquid/photo-upload-square.html) | 2026-08-13.1 |
| [photo-upload-rectangle.html](custom-liquid/photo-upload-rectangle.html) | 2026-08-13.1 |
| [photo-upload-bulk-square.html](custom-liquid/photo-upload-bulk-square.html) | 2026-08-13.1 |
| [photo-upload-bulk-rectangle.html](custom-liquid/photo-upload-bulk-rectangle.html) | 2026-08-13.1 |
| [photo-upload-replacement.html](custom-liquid/photo-upload-replacement.html) | 2026-09-11.2 |

## Before deploying

Two fixes from 2026-09-11 are verified only in Blink (headless Chromium and
Edge). On iOS every browser is WebKit, and DevTools device emulation changes
viewport, DPR, UA string, touch events and `(hover: none)` but never the
rendering engine, and cannot simulate a collapsing URL bar — so neither can be
checked from a desktop browser. **Test these on a physical iPhone once the
snippets are live:**

1. **Scroll lock.** Scroll a good way down a product page, note the position,
   open the photo modal. Drag at the top of the grid and again past its bottom —
   the page behind must not move. **Then close the modal: does the page return to
   exactly where you were?** This is the likeliest failure and the most visible —
   `position: fixed` on `<body>` collapses the scroll position, and if the
   restore doesn't fire the customer is thrown to the top mid-flow. Confirm the
   page scrolls normally afterwards; if it feels frozen, `position: fixed` wasn't
   removed. Also try opening the modal right after using the theme's cart drawer,
   in case both apply a lock.
2. **`100dvh`.** Scroll slightly so Safari's URL bar collapses, then open the
   modal and scroll to the footer. The Upload button must be reachable, not
   pinned under the bottom toolbar. A small shift as the toolbar collapses is
   expected; content permanently hidden behind it is not.
3. **Replacement page undo.** Needs a real order — open a replacement URL on a
   phone and check the Undo pill is comfortably tappable and doesn't collide with
   the Keep/Replaced badge in the opposite corner.

To see what changed between versions, use `git log <file>` on any individual
snippet.

Test pages are not deployed and have no version tracking:
- [test.html](custom-liquid/test.html) — multi-variant test harness for the upload flow.
- [test-replacement.html](custom-liquid/test-replacement.html) — loader page for testing the
  replacement flow against the live partials (needs a local HTTP server because
  it uses `fetch`).
