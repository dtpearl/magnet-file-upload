// Stand-ins for the Shopify objects the snippets read.
//
// The snippets touch a deliberately small surface - {{ product.id }} and
// product.metafields.custom.image_uploader_shape - which is the whole reason
// they can be rendered locally at all. Keep it that way: anything reaching for
// a richer Shopify object (line items, money filters, routes) stops being
// testable here and has to go to a real store.
//
// IDs match the ones test.html hard-codes, so the same selectors work against
// both harnesses.

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
    blurb: 'Single image, 1:1, keeps the theme quantity selector',
  },
  'bulk-rectangle': {
    id: 'bulk-rect-test',
    shape: 'bulk_rectangle',
    label: 'Bulk rectangle',
    blurb: 'Single image, 83:59, keeps the theme quantity selector',
  },
};

export function productFor(key) {
  const v = VARIANTS[key];
  if (!v) throw new Error(`Unknown variant "${key}". Try: ${Object.keys(VARIANTS).join(', ')}`);
  return {
    id: v.id,
    title: `Test ${v.label} Magnet`,
    metafields: { custom: { image_uploader_shape: v.shape } },
  };
}

// Cart line items for the quantity-control snippet. It gates on the
// _photo_count property written by cart-button-control: >1 is a pack and loses
// its stepper, 1 is bulk and keeps it.
export const CART = {
  items: [
    { key: 'pack1', title: 'Test Square Magnet', quantity: 1, properties: { _photo_count: '9' } },
    { key: 'bulk1', title: 'Test Bulk Magnet', quantity: 3, properties: { _photo_count: '1' } },
    { key: 'plain', title: 'A Product With No Photos', quantity: 2, properties: {} },
  ],
};
