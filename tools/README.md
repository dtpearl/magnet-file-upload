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
| `npm run setup-libs` | One-off, Linux only: fetches Chromium's shared libraries without root. |
| `npm run deploy` | Pushes the five snippets to a Shopify theme. |

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

On Linux it also needs a few shared libraries. Playwright's own
`install-deps` requires root, so if you don't have sudo use this instead:

    npm run setup-libs

That downloads the packages as a normal user and unpacks them into
`tools/.chromium-libs` (gitignored), which `npm run check` adds to the
library path automatically. Nothing is installed system-wide, and nothing
outside `tools/` is touched. `npm run dev` and `npm run verify` need none of
this - they don't use a browser.

It asserts no horizontal overflow, no sub-44px touch target on a coarse pointer,
no crushed crop container, no scrolling behind an open modal, no wrapped footer
buttons, and a minimum thumbnail width — the defects fixed on 2026-09-11, so a
regression is caught rather than rediscovered.

## What it cannot do

Blink is not WebKit. The iOS scroll lock and `100dvh` behaviour cannot be
reached from any desktop browser or from this harness — see **Before deploying**
in the root README.

## Deploying with the Shopify CLI

Removes the paste step. One-off setup:

    npm install -g @shopify/cli     # no root needed under nvm
    shopify auth login              # opens a browser once
    echo '{"store":"your-store.myshopify.com"}' > tools/.deploy-config.json

Then, from `tools/`:

| Command | Target |
| --- | --- |
| `npm run deploy` | Prompts you to pick a theme — safest |
| `npm run deploy -- --theme 12345` | A specific theme by id or name |
| `npm run deploy -- --live` | The published theme; asks you to type `live` |
| `npm run deploy -- --print` | Prints the command, runs nothing |

`shopify theme list` shows theme ids and which one is live.

### Two flags the script fixes for you

`--only` limits the upload to our five snippets, and `--nodelete` stops remote
files being removed. The first matters more than it looks: a bare
`shopify theme push` uploads the **whole** local directory over the remote
theme, and this directory holds only snippets — so without `--only` it would
delete every template, section and asset in the theme. Never run a bare push
from here.

### If the CLI rejects the directory

`theme push` expects a directory matching Shopify's theme structure, and
`theme/` here holds only `snippets/`. If it refuses, pull a full theme somewhere
**outside** this repo and point the script at it:

    mkdir -p ~/shopify-themes && cd ~/shopify-themes
    shopify theme pull --store your-store.myshopify.com

then add the path to `tools/.deploy-config.json`:

    { "store": "your-store.myshopify.com",
      "themePath": "/home/you/shopify-themes/your-theme" }

The script copies the snippets in before pushing, so that checkout never needs
editing by hand and can be deleted and re-pulled whenever. It stays out of git
either way.
