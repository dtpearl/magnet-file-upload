# magnet-file-upload

Self-hosted Custom Liquid snippets for the photo-upload and replacement flow on
luxmagnetco.myshopify.com.

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
| [cart-button-control.html](cart-button-control.html) | 2026-08-13.1 |
| [cart-quantity-control.html](cart-quantity-control.html) | 2026-08-13.1 |
| [photo-upload-styles.html](photo-upload-styles.html) | 2026-09-11.5 |
| [photo-upload-core.html](photo-upload-core.html) | 2026-09-11.1 |
| [photo-upload-square.html](photo-upload-square.html) | 2026-08-13.1 |
| [photo-upload-rectangle.html](photo-upload-rectangle.html) | 2026-08-13.1 |
| [photo-upload-bulk-square.html](photo-upload-bulk-square.html) | 2026-08-13.1 |
| [photo-upload-bulk-rectangle.html](photo-upload-bulk-rectangle.html) | 2026-08-13.1 |
| [photo-upload-replacement.html](photo-upload-replacement.html) | 2026-09-11.2 |

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
- [test.html](test.html) — multi-variant test harness for the upload flow.
- [test-replacement.html](test-replacement.html) — loader page for testing the
  replacement flow against the live partials (needs a local HTTP server because
  it uses `fetch`).
