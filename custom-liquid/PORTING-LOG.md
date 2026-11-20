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

### 2026-11-18  f7173c8  Sell bulk magnets in tiers and lock their cart quantity

- Snippets: photo-upload.liquid, cart-quantity-control.liquid
- Blocks: photo-upload-bulk-square.html, photo-upload-bulk-rectangle.html,
  cart-button-control.html, cart-quantity-control.html
- What changed: the two bulk products now carry a "Number of magnets" option
  whose values are whole sheets (45/90/180/270/450 square, 30/60/120/180/300
  rectangle). The product snippet builds a JSON map of variant id to magnet
  count and per-magnet price, renders a note under Select photo with the
  selected tier's per-magnet price, and the cart button control reads the
  chosen variant at upload, on every variant change and at submit, writing its
  count to `_magnets_per_unit` and the "Photos" property. The cart snippet
  locks every photo line, not just packs, since the tier is now the quantity
  and the theme's quantity selector is removed from the bulk template. The same
  snippet also fixes a bug the blocks still have: the reveal rule for unlocked
  steppers was less specific than the hide rules and never won, so every
  stepper in the cart stayed hidden. The verdict is now part of the hide
  selector and there is no reveal rule.
- Porting notes: the tier map is Liquid over `product.options`,
  `product.variants`, `variant.price` and the `money` filter, and must go in
  both bulk blocks (the pack blocks are untouched). The cart button control
  changes are shape-independent and go in cart-button-control.html once. In
  cart-quantity-control.html the gate becomes "property present", the
  verdict string "pack" becomes "locked", and the <style> block is replaced
  wholesale (it uses :is(), fine in every browser Dawn supports).

### 2026-11-18  ca66999  Put the modal scrollbar at the screen edge

- Snippets: photo-upload-styles.liquid
- Blocks: photo-upload-styles.html, and the CSS copy in test.html
- What changed: on desktop `.modal-content` is the scroller, and its 720px
  max-width with auto margins placed its scrollbar mid-screen on a laptop.
  The max-width and margin are gone; the cap is now the horizontal padding,
  `max(32px, calc((100% - 720px) / 2 + 32px))`, so the element spans the modal
  and the content box is the same 656px, centred, as before.
- Porting notes: one rule, `.modal-content`, in the shared stylesheet. The
  mobile override at 768px is untouched.

### 2026-11-18  6501d0f  Centre the modal headings

- Snippets: photo-upload-styles.liquid
- Blocks: photo-upload-styles.html, and the CSS copy in test.html
- What changed: `.modal-title-container` gets `justify-content: center` and
  `.modal-title` gets `text-align: center`, so "Select your photos" and "Crop
  your photo" sit on the same centre line as the rest of the modal instead of
  hugging the left edge of the content column.
- Porting notes: two declarations added to existing rules, nothing removed. The `magnets` constant (45/30)
  remains only as the fallback for a bulk product with no tier option.

### 2026-11-20  (hash: fill in on commit)  Darken the modal copy and outline buttons for contrast

- Snippets: photo-upload-styles.liquid
- Blocks: photo-upload-styles.html, and the CSS copy in test.html
- What changed: the grey used for informational copy on the cream modal
  background (`#6b7280` on `#f0e5d9`) measured 3.9:1, under the 4.5:1 AA
  floor, and the outline button border (`#9ca3af`) 2.0:1. Every copy rule
  that used it moves to `#374151`, the existing heading colour (8.3:1):
  `.crop-info`, `.content-subtitle`, `.post-selection-info`,
  `.progress-text`, `.processing-text`, and the resting text of
  `.remove-all-files-btn` / `.confirm-cancel-btn`, whose border becomes
  `#6b7280`. Their hover state is unchanged. `.upload-text .or-text` goes
  from `#9ca3af` to `#4b5563`, and the inactive `.orientation-toggle-btn`
  from `#7d7268` to `#4b5563` with its hover lifted to `#374151` so the two
  states stay distinct.
- Porting notes: colour values only, nine rules, no selector or layout change.
  All in the shared stylesheet, so the block and the test.html copy get the
  same substitutions. Not touched, by decision rather than oversight: the
  brand `#95887a` fill under white text (3.5:1 on the Upload button, 2.6:1 on
  the product page's Select photos button because of its `opacity: 0.8`) and
  the disabled Upload button, which WCAG exempts.

### 2026-11-20  (hash: fill in on commit)  Shrink the drop zone and enlarge the count once photos are in

- Snippets: photo-upload-styles.liquid, photo-upload-core.liquid, photo-upload.liquid
- Blocks: photo-upload-styles.html (and the CSS copy in test.html),
  photo-upload-core.html, all four shape blocks
- What changed: with some photos selected but not yet the full set, the
  36px "drag & drop / your photos / or" headline was the largest thing in
  the modal while the "5/9 photos selected" line was unstyled body text.
  `updateUploadUI` now toggles `has-photos` on `.upload-area` when the
  count is between one and the maximum. In that state the count line,
  which gains the class `file-count-display`, moves to the top of the zone
  (flex `order: -1`) at 22px bold (26px desktop), and the headline folds to
  one 16px line (18px desktop) above the upload button. Empty and complete
  states are unchanged.
- Porting notes: the markup change is one class attribute on the
  `file-count-display-{{ product.id }}` div and must land in all four shape
  blocks. The JS is one `classList.toggle` line in `updateUploadUI` plus the
  version stamps (header and `console.log`). The CSS is new rules only,
  one block before `.upload-status` and three in the 769px breakpoint.

### 2026-11-20  (hash: fill in on commit)  Shorter camera-roll button label on phones

- Snippets: photo-upload.liquid, photo-upload-styles.liquid
- Blocks: all four shape blocks; photo-upload-styles.html and the CSS copy
  in test.html
- What changed: "Upload from camera roll or PC" measures 306px at its 14px
  Cardo size and the button's text area is 294px on a 390px phone, so it
  wrapped to an orphaned "PC" on every phone. The label is now two spans,
  `upload-btn-wide` and `upload-btn-narrow`; the stylesheet hides the
  narrow one and swaps them below 768px, where the button reads "Upload
  from camera roll". `text-wrap: balance` on the button keeps any wrap that
  still happens even. Below 768px the button's side padding drops from
  32px to 16px, which is what gets the shorter label onto one line at 320px.
  The JS only listens for clicks on this button, so the spans change nothing
  there.
- Porting notes: the markup is the same two spans in all four shape blocks.
  The CSS is one new rule after `.upload-btn:hover` and three in the existing
  768px block.
