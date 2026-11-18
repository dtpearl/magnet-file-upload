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
| `npm run verify` | Proves the snippets behave, and reports drift from `custom-liquid/`. Fast, no browser. |
| `npm run drift` | Unified diff of what the snippets render versus the frozen `custom-liquid/` blocks. |
| `npm run check` | Drives the real upload flow across 10 viewports in headless Chromium. |
| `npm run check-tiers` | Bulk tiers and the cart lock: the right numbers reach the line item. Headless Chromium. |
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
- For each target (four shapes, cart, replacement) whether the snippets still
  render the same markup and JS as the `custom-liquid/` blocks, and whether any
  of the blocks' CSS rules has gone. Reported as `SAME` or `DRIFT`, not as a
  failure: `custom-liquid/` is frozen at the parity commit, so drift is what
  happens when the snippets move on.
- That any drift has at least one entry in
  [custom-liquid/PORTING-LOG.md](../custom-liquid/PORTING-LOG.md). This one
  **fails**, so a snippet change without a log entry is caught on the first run.

The snippets are consolidated, so they are no longer copies of the files in
`custom-liquid/`. The comparison is therefore on rendered output, normalising
whitespace, HTML comments, version stamps, JS quote style and trailing commas —
each documented in the file with the reason it is safe to ignore.

Run it before committing a snippet change.

## `npm run drift`

Renders every target from both `theme/snippets` and `custom-liquid`, puts the
two into one canonical layout (one tag or statement per line, the same
intentional differences ignored as above) and prints a unified diff per target
using `git diff --no-index`. This is the change to carry into the pasted blocks
if they ever need to catch up; the porting log says which snippet maps to which
block.

    npm run drift                            # all targets, to the terminal
    npm run drift -- square cart             # just these
    npm run drift -- --out ../dist/drift.diff

Rendered output carries the fixture product ids (`square-test`, `bulk-sq-test`
and so on) where a block has `{{ product.id }}`.

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

## `npm run check-tiers`

Same Chromium setup as `npm run check`. Opens the bulk rectangle page, changes
the tier, dispatches the core's `photosUploaded` event with the detail it would
carry (so nothing is uploaded anywhere), and asserts the per-magnet note and
the `properties[...]` inputs follow the selected variant at upload, on a later
change, and at submit. Then the pack page, to prove it is untouched, and the
cart page, where the harness serves `/cart.js` from the fixtures so the lock
really runs: pack and bulk lines lose their stepper, a plain product keeps
its own. That last assertion is what found the stepper-reveal bug fixed on
2026-11-18.

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

### Why empty folders appear in `theme/`

`shopify theme push` only accepts a folder as a theme if it contains
`config/`, `layout/` and `templates/`. `theme/` holds just `snippets/`, so every
deploy used to stop on *"It doesn't seem like you're running this command in a
theme directory. Do you want to proceed?"* Saying yes was harmless, but getting
used to clicking through a warning on every deploy is how you miss the one that
matters.

So `npm run deploy` creates those three folders, empty, before it pushes. They
change nothing about what gets uploaded — `--only` still limits that to the
five snippets — and git doesn't track empty folders, so they never show up in a
commit. Delete them whenever; the next deploy puts them back.

They are one more reason never to run a bare `shopify theme push` from
`theme/`: without `--nodelete`, empty `layout/` and `templates/` folders tell
Shopify the theme has no layouts or templates.

### Pushing from a full theme checkout (optional)

Not needed, but if you ever want to, pull a theme **outside** this repo and
point the script at it:

    mkdir -p ~/shopify-themes && cd ~/shopify-themes
    shopify theme pull --store your-store.myshopify.com

then add the path to `tools/.deploy-config.json`:

    { "store": "your-store.myshopify.com",
      "themePath": "/home/you/shopify-themes/your-theme" }

The script copies the snippets in before pushing, so that checkout never needs
editing by hand and can be deleted and re-pulled whenever. It stays out of git
either way.
