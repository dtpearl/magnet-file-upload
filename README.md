# magnet-file-upload

Self-hosted Custom Liquid snippets for the photo-upload and replacement flow on
luxmagnetco.myshopify.com.

## Repository layout

| Path | What it is |
| --- | --- |
| `custom-liquid/` | The blocks as deployed today, pasted by hand into Custom Liquid sections. Still the live approach. |
| `theme/snippets/` | The same functionality consolidated into five theme snippets. Not deployed yet. |
| `tools/` | Local Liquid harness — render and test the snippets with no Shopify store. See [tools/README.md](tools/README.md). |

`custom-liquid/` is the reference implementation: `cd tools && npm run verify`
renders both and asserts the snippets produce the same markup, JS and CSS, so
the consolidation provably changed nothing that reaches the browser.

## Two ways to deploy

**Today — Custom Liquid blocks.** Each file in `custom-liquid/` is pasted into a
Custom Liquid section. Most go into *two* product templates, so every change has
to be applied twice, and nothing warns you if you update one and forget the other.

**Ready when you are — theme snippets.** `theme/snippets/` holds the same
functionality consolidated into five files:

| Snippet | Holds | Goes on |
| --- | --- | --- |
| `photo-upload-styles` | Every CSS rule in the project | pulled in automatically |
| `photo-upload-core` | All shared JS | pulled in automatically |
| `photo-upload` | All four shapes + cart button control | both product templates |
| `photo-upload-replacement` | The replacement page | the replacement page |
| `cart-quantity-control` | Quantity lock | cart template |

### Installing them (browser only — no CLI needed)

1. Online Store → Themes → **duplicate the theme first**
2. On the duplicate: ⋯ → **Edit code**
3. **Snippets** → "Add a new snippet" for each of the five. Name them without the
   extension — type `photo-upload-styles`, not `photo-upload-styles.liquid`
4. Wire up three call sites:

| Where | Line |
| --- | --- |
| Both product templates (the existing Custom Liquid block) | `{% render 'photo-upload', product: product %}` |
| Cart template, above the items | `{% render 'cart-quantity-control' %}` |
| Replacement page | see below |

5. Preview the duplicate, then publish

`photo-upload` and `photo-upload-replacement` pull in the styles and core
themselves, so **paste order is no longer something you can get wrong.**

### The replacement page as a section

Sections appear in the theme editor and can be added to templates by dragging;
snippets cannot. For the replacement page that is the nicer fit. Edit code →
**Sections** → "Add a new section" named `photo-upload-replacement`, containing:

```liquid
{% render 'photo-upload-replacement' %}

{% schema %}
{
  "name": "Photo replacement",
  "presets": [{ "name": "Photo replacement" }]
}
{% endschema %}
```

The `presets` array is what makes it appear under **Add section**. Then in the
theme editor, open the page, use **Create template** so it is not added site-wide,
and add the section. It will look sparse in the editor because it needs
`?session=…&product=…&variant=…` to render slots — that is expected, and a
`designMode` guard stops it redirecting you out of the editor.

The product page cannot be a section: it has to sit inline next to Add to Cart,
which is what the Custom Liquid block in step 4 is doing.

> **`{% render %}` has an isolated scope.** Unlike the deprecated `{% include %}`
> it does not inherit the parent's variables, so `product` must be passed in.
> Omit it and nothing renders — no output, no error. `npm run verify` has a
> regression test for exactly this.

Once on snippets the 50 KB ceiling stops applying — it is a limit on the Custom
Liquid *setting value*, not on theme files — which is what made merging the CSS
into one sheet possible at all.

## Local testing

    cd tools
    npm install
    npm run dev        # http://127.0.0.1:8080

Renders `theme/snippets` on every request, so editing a snippet and refreshing is
the whole loop — nothing is uploaded to Shopify. `npm run verify` proves the
snippets still produce what `custom-liquid/` produces; `npm run check` drives the upload flow across 10
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


### theme/snippets versions

| Snippet | Current version |
| --- | --- |
| [photo-upload-styles.liquid](theme/snippets/photo-upload-styles.liquid) | 2026-09-14.1 |
| [photo-upload-core.liquid](theme/snippets/photo-upload-core.liquid) | 2026-09-11.1 |
| [photo-upload.liquid](theme/snippets/photo-upload.liquid) | 2026-09-14.1 |
| [photo-upload-replacement.liquid](theme/snippets/photo-upload-replacement.liquid) | 2026-09-14.1 |
| [cart-quantity-control.liquid](theme/snippets/cart-quantity-control.liquid) | 2026-08-13.1 |

To see what changed between versions, use `git log <file>` on any individual
snippet.

Test pages are not deployed and have no version tracking:
- [test.html](custom-liquid/test.html) — multi-variant test harness for the upload flow.
- [test-replacement.html](custom-liquid/test-replacement.html) — loader page for testing the
  replacement flow against the live partials (needs a local HTTP server because
  it uses `fetch`).
