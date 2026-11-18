// Stand-ins for the Shopify objects the snippets read.
//
// The snippets touch a deliberately small surface, which is the whole reason
// they can be rendered locally at all:
//
//   {{ product.id }}
//   product.metafields.custom.image_uploader_shape
//   product.options, product.variants[].id/.options/.price   (bulk tiers only)
//   product.selected_or_first_available_variant.id           (bulk tiers only)
//   the `money` filter                                        (stubbed in render.mjs)
//
// Keep it that way: anything reaching for a richer Shopify object (line items,
// routes, cart) stops being testable here and has to go to a real store.
//
// IDs match the ones test.html hard-codes, so the same selectors work against
// both harnesses.

// Tier prices in cents: per-sheet 37.99 / 35.99 / 33.99 / 31.99 / 29.99 for
// 5 / 10 / 20 / 30 / 50 sheets. Same totals for both shapes.
const TIER_PRICES = [18995, 35990, 67980, 95970, 149950];

// Bulk variants as the store has them: option "Number of magnets", every
// value starting with the count, which is what the snippet parses.
function bulkVariants(key, perSheet) {
  return [5, 10, 20, 30, 50].map((sheets, i) => {
    const magnets = sheets * perSheet;
    return {
      id: `${key}-v${magnets}`,
      title: `${magnets} magnets`,
      option1: `${magnets} magnets`,
      options: [`${magnets} magnets`],
      price: TIER_PRICES[i],
      sku: `BULK-${key === 'bulk-sq-test' ? 'SQ' : 'RECT'}-${String(sheets).padStart(2, '0')}`,
      available: true,
    };
  });
}

export const VARIANTS = {
  square: {
    id: 'square-test',
    shape: 'square',
    label: 'Square',
    blurb: '9 photos, 1:1 aspect ratio, no orientation toggle',
  },
  rectangle: {
    id: 'rect-test',
    shape: 'rectangle',
    label: 'Rectangle',
    blurb: '6 photos, 83:59 aspect ratio, orientation toggle',
  },
  'bulk-square': {
    id: 'bulk-sq-test',
    shape: 'bulk_square',
    label: 'Bulk square',
    blurb: 'Single image, 1:1, five tier variants (45 to 450 magnets)',
    options: ['Number of magnets'],
    variants: bulkVariants('bulk-sq-test', 9),
  },
  'bulk-rectangle': {
    id: 'bulk-rect-test',
    shape: 'bulk_rectangle',
    label: 'Bulk rectangle',
    blurb: 'Single image, 83:59, five tier variants (30 to 300 magnets)',
    options: ['Number of magnets'],
    variants: bulkVariants('bulk-rect-test', 6),
  },
};

export function productFor(key) {
  const v = VARIANTS[key];
  if (!v) throw new Error(`Unknown variant "${key}". Try: ${Object.keys(VARIANTS).join(', ')}`);
  const product = {
    id: v.id,
    title: `Test ${v.label} Magnet`,
    metafields: { custom: { image_uploader_shape: v.shape } },
  };
  if (v.variants) {
    product.options = v.options;
    product.variants = v.variants;
    product.selected_or_first_available_variant = v.variants[0];
  }
  return product;
}

// Cart line items for the quantity-control snippet. It gates on the
// _photo_count property written by the cart button control: present means a
// photo line (pack or bulk) and the stepper is replaced by a fixed number.
export const CART = {
  items: [
    { key: 'pack1', title: 'Test Square Magnet', quantity: 1, properties: { _photo_count: '9', _magnets_per_unit: '9' } },
    { key: 'bulk1', title: 'Test Bulk Magnet - 60 magnets', quantity: 1, properties: { _photo_count: '1', _magnets_per_unit: '60' } },
    { key: 'plain', title: 'A Product With No Photos', quantity: 2, properties: {} },
  ],
};
