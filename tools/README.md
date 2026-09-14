# Local Liquid harness

Renders `theme/snippets/*.liquid` on your machine so the snippets can be changed
and checked without a Shopify store. Liquid is rendered by
[liquidjs](https://liquidjs.com), which implements Shopify's `{% render %}`
semantics including its isolated scope — `verify-parity.mjs` asserts that rather
than assuming it.

## Setup

    cd tools
    npm install

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on <http://127.0.0.1:8080>. Edit a snippet, refresh. |
| `npm run verify` | Proves the snippets behave and match `custom-liquid/`. Fast, no browser. |
| `npm run check` | Drives the real upload flow across 10 viewports in headless Chromium. |
| `npm run build` | Writes static HTML to `../dist/`. |

`npm run dev` re-renders on every request, so there is no build step and no
second copy of the markup to keep in step — which is what `custom-liquid/test.html`
became.

## What `npm run verify` covers

- `{% render %}` does **not** inherit the parent scope, and passed variables do.
- Each variant's metafield guard selects exactly one snippet.
- Forgetting `product:` renders nothing rather than erroring — the trap that
  makes this refactor fail silently, asserted so it stays documented.
- Each of the four shapes produces the same markup and JS as the files in
  `custom-liquid/`, which are what is deployed today.
- No CSS rule was lost when the stylesheets were merged (checked rule by rule).

The snippets are consolidated, so they are no longer copies of the files in
`custom-liquid/`. The comparison is therefore on rendered output, normalising
whitespace, HTML comments, version stamps, JS quote style and trailing commas —
each documented in the file with the reason it is safe to ignore.

Run it before committing a snippet change. `custom-liquid/` is the reference
implementation, so as long as you keep it this is what proves the snippets still
do what the deployed code does.

## `npm run check`

Needs Chromium once:

    npx playwright install chromium

On Linux it also needs system libraries once:

    sudo npx playwright install-deps chromium

It asserts no horizontal overflow, no sub-44px touch target on a coarse pointer,
no crushed crop container, no scrolling behind an open modal, no wrapped footer
buttons, and a minimum thumbnail width — the defects fixed on 2026-09-11, so a
regression is caught rather than rediscovered.

## What it cannot do

Blink is not WebKit. The iOS scroll lock and `100dvh` behaviour cannot be
reached from any desktop browser or from this harness — see **Before deploying**
in the root README.
