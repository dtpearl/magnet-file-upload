# magnet-file-upload

Self-hosted Custom Liquid snippets for the photo-upload and replacement flow on
luxmagnetco.myshopify.com.

## Deployed-snippet versions

When updating a Custom Liquid section in Shopify, compare the `Version:` line at
the top of the pasted block against the version listed here. If they match, the
section is up to date.

| File | Current version |
| --- | --- |
| [cart-button-control.html](cart-button-control.html) | 2026-04-22.2 |
| [photo-upload-styles.html](photo-upload-styles.html) | 2026-05-22.1 |
| [photo-upload-core.html](photo-upload-core.html) | 2026-05-22.1 |
| [photo-upload-square.html](photo-upload-square.html) | 2026-04-22.1 |
| [photo-upload-rectangle.html](photo-upload-rectangle.html) | 2026-04-22.1 |
| [photo-upload-bulk-square.html](photo-upload-bulk-square.html) | 2026-04-22.1 |
| [photo-upload-bulk-rectangle.html](photo-upload-bulk-rectangle.html) | 2026-04-22.1 |
| [photo-upload-replacement.html](photo-upload-replacement.html) | 2026-05-22.1 |

To see what changed between versions, use `git log <file>` on any individual
snippet.

Test pages are not deployed and have no version tracking:
- [test.html](test.html) — multi-variant test harness for the upload flow.
- [test-replacement.html](test-replacement.html) — loader page for testing the
  replacement flow against the live partials (needs a local HTTP server because
  it uses `fetch`).
