# Porting log: theme/snippets → custom-liquid

`theme/snippets/` is where changes are made. `custom-liquid/` is frozen at the
point the two were proven identical by `npm run verify`:

    parity commit: 71c552e  (2026-11-17)

Nothing in `custom-liquid/` is edited after that commit. If the pasted Custom
Liquid blocks ever need to catch up, this file plus git is enough to do it
without re-deriving anything.

## How to see what needs porting

| Want | Run (from the repo root unless noted) |
| --- | --- |
| Every snippet change since parity, as source | `git diff 71c552e -- theme/snippets` |
| One entry's change, as source | `git show <commit> -- theme/snippets` |
| What a browser would receive differently, per block | `cd tools && npm run drift` |
| The same, saved to a file | `cd tools && npm run drift -- --out ../dist/drift.diff` |

`npm run drift` renders both sides exactly as `npm run verify` does and prints a
unified diff of the rendered output for each target (four shapes, cart,
replacement). It ignores the differences the consolidation introduced on
purpose: whitespace, HTML comments, version stamps, JS quote style and trailing
commas. What remains is the change to carry across.

Rendered means `{{ product.id }}` shows up as the fixture id (`square-test`,
`rect-test`, `bulk-sq-test`, `bulk-rect-test`). Translate it back to
`{{ product.id }}` when pasting into a block.

## Which snippet maps to which block

| Snippet | Blocks to update |
| --- | --- |
| `photo-upload-styles.liquid` | `photo-upload-styles.html`, and the hand-maintained CSS copy in `test.html` |
| `photo-upload-core.liquid` | `photo-upload-core.html` |
| `photo-upload.liquid` (markup body) | all four of `photo-upload-square.html`, `photo-upload-rectangle.html`, `photo-upload-bulk-square.html`, `photo-upload-bulk-rectangle.html`; the `case` block at the top says which values each one gets |
| `photo-upload.liquid` (cart button control, bottom of file) | `cart-button-control.html` |
| `photo-upload-replacement.liquid` | `photo-upload-replacement.html` |
| `cart-quantity-control.liquid` | `cart-quantity-control.html` |

Two things only the blocks have: the 50 KB ceiling on a Custom Liquid setting
value, and a copy of the shared CSS in `test.html`. A change that fits a snippet
may not fit a block.

## Keeping this log

Every commit that touches `theme/snippets/` adds an entry under **Entries**, in
the same commit. `npm run verify` fails when the snippets differ from
`custom-liquid/` and this file has no entries, so a forgotten entry is caught
on the first run. Newest entry at the bottom.

Entry format:

```
### 2026-11-30  abc1234  One-line summary, same as the commit subject

- Snippets: photo-upload.liquid, photo-upload-core.liquid
- Blocks: photo-upload-bulk-square.html, photo-upload-bulk-rectangle.html, photo-upload-core.html
- What changed: two or three sentences a person could work from without the diff.
- Porting notes: anything not mechanical. A Liquid variable that becomes a
  different literal in each block, a change that must land in all four shape
  blocks, a CSS rule that also goes in test.html, anything that may not fit 50 KB.
```

The commit hash is what makes an entry complete: `git show <hash> -- theme/snippets`
is the exact change, so the prose only has to say what and why.

## Entries

_None yet. The snippets still match `custom-liquid/`._
