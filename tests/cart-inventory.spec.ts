import { expect, test } from '@playwright/test';
let isCartItemAvailable: typeof import('../lib/cart-store').isCartItemAvailable;
let normalizeCartItems: typeof import('../lib/cart-store').normalizeCartItems;
let useCartStore: typeof import('../lib/cart-store').useCartStore;
import { isProductAvailableForPurchase } from '../lib/commerce';
import type { Product } from '../lib/data';

function product(overrides: Partial<Product> = {}): Product {
  return { id: 'shirt', name: 'Shirt', price: 1000, description: '', longDescription: '', fabricType: 'Cotton', color: 'Blue', colorHex: '#0000ff', images: ['/placeholder.jpg'], inStock: true, stockQuantity: 10, sku: 'SHIRT', ...overrides };
}
function sizedProduct(): Product {
  return product({ commerce: { productKind: 'READY_TO_WEAR', requiresSelection: true, stitchingEligible: false, details: [], variants: [{ id: 'large', label: 'L', optionKey: 'l', priceAdjustment: 200, stockQuantity: 3, inStock: true, isActive: true }] } });
}
const selection = { variant: { id: 'large', label: 'L', priceAdjustment: 200 }, unitPrice: 1200 };

test.beforeAll(async () => {
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) } });
  ({ isCartItemAvailable, normalizeCartItems, useCartStore } = require('../lib/cart-store'));
});
test.beforeEach(() => useCartStore.getState().clearCart());

test('repeated additions cannot exceed the ten units in inventory', () => {
  useCartStore.getState().addItem(product(), 8);
  useCartStore.getState().addItem(product(), 8);
  expect(useCartStore.getState().items[0].quantity).toBe(10);
});
test('cart plus and quantity updates cannot exceed available inventory', () => {
  useCartStore.getState().addItem(product());
  useCartStore.getState().updateQuantity('shirt', 67);
  expect(useCartStore.getState().items[0].quantity).toBe(10);
});
test('zero-stock products cannot enter the cart even if inStock is stale', () => {
  useCartStore.getState().addItem(product({ stockQuantity: 0 }));
  expect(useCartStore.getState().items).toEqual([]);
  expect(isProductAvailableForPurchase(product({ stockQuantity: 0 }))).toBe(false);
});
test('each size is limited to its own inventory', () => {
  useCartStore.getState().addItem(sizedProduct(), 10, undefined, selection);
  expect(useCartStore.getState().items[0].quantity).toBe(3);
});
test('required sizes cannot be bypassed by adding a generic product line', () => {
  useCartStore.getState().addItem(sizedProduct());
  expect(useCartStore.getState().items).toEqual([]);
});
test('missing or removed variants are unavailable rather than assumed buyable', () => {
  const [item] = normalizeCartItems([{ product: sizedProduct(), quantity: 1, variant: { id: 'removed', label: 'XL', priceAdjustment: 0 } }]);
  expect(isCartItemAvailable(item)).toBe(false);
});
test('an excessive existing quantity cannot pass availability checks', () => {
  expect(isCartItemAvailable({ lineId: 'shirt', product: product(), quantity: 67 })).toBe(false);
});
test('old saved carts and duplicate lines are capped to available stock', () => {
  const [item] = normalizeCartItems([{ product: product(), quantity: 8 }, { product: product(), quantity: 8 }]);
  expect(item.quantity).toBe(10);
});
test('invalid quantity input cannot corrupt cart totals', () => {
  useCartStore.getState().addItem(product(), Number.NaN);
  expect(useCartStore.getState().items).toEqual([]);
  useCartStore.getState().addItem(product());
  useCartStore.getState().updateQuantity('shirt', Number.NaN);
  expect(useCartStore.getState().items[0].quantity).toBe(1);
});

test('fresh inventory replaces stale prices, caps quantities and preserves stitching', async () => {
  useCartStore.getState().addItem(product(), 8, { profileId: 'measurement', profileName: 'My measurements', price: 500 });
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ products: [product({ price: 1400, stockQuantity: 2 })] }));
  try {
    await useCartStore.getState().refreshInventory();
    const item = useCartStore.getState().items[0];
    expect(item.quantity).toBe(2);
    expect(item.product.price).toBe(1400);
    expect(item.stitchingProfileId).toBe('measurement');
  } finally { globalThis.fetch = originalFetch; }
});
test('deleted products remain visible but cannot be checked out', async () => {
  useCartStore.getState().addItem(product());
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ products: [] }));
  try {
    await useCartStore.getState().refreshInventory();
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(isCartItemAvailable(useCartStore.getState().items[0])).toBe(false);
  } finally { globalThis.fetch = originalFetch; }
});
test('a stock-check failure cannot leave checkout marked ready', async () => {
  useCartStore.getState().addItem(product());
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('Offline'); };
  try {
    await expect(useCartStore.getState().refreshInventory()).rejects.toThrow();
    expect(useCartStore.getState().inventoryStatus).toBe('error');
  } finally { globalThis.fetch = originalFetch; }
});
test('checking out one line preserves unpurchased items and later additions', () => {
  useCartStore.getState().addItem(product(), 2);
  useCartStore.getState().addItem(product({ id: 'other' }), 3);
  const purchased = [{ ...useCartStore.getState().items[0] }];
  useCartStore.getState().addItem(product(), 1);
  useCartStore.getState().removePurchasedItems(purchased);
  expect(useCartStore.getState().items.map(i => [i.lineId, i.quantity])).toEqual([['shirt', 1], ['other', 3]]);
});

test('older product cards cannot overwrite freshly checked stock or prices', async () => {
  useCartStore.getState().addItem(product(), 2);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ products: [product({ price: 1400, stockQuantity: 2 })] }));
  try {
    await useCartStore.getState().refreshInventory();
    useCartStore.getState().addItem(product(), 8);
    expect(useCartStore.getState().items[0].quantity).toBe(2);
    expect(useCartStore.getState().items[0].product.price).toBe(1400);
  } finally { globalThis.fetch = originalFetch; }
});

test('older size selections cannot restore an obsolete variant price', async () => {
  useCartStore.getState().addItem(sizedProduct(), 1, undefined, selection);
  const fresh = sizedProduct(); fresh.price = 1500; fresh.commerce!.variants[0].priceAdjustment = 300;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ products: [fresh] }));
  try {
    await useCartStore.getState().refreshInventory();
    useCartStore.getState().addItem(sizedProduct(), 1, undefined, selection);
    expect(useCartStore.getState().getTotalPrice()).toBe(3600);
  } finally { globalThis.fetch = originalFetch; }
});

for (const removal of ['removeItem', 'removePurchasedItems'] as const) {
  test(`removing the last line via ${removal} permits adding fresh restocked inventory`, async () => {
    useCartStore.getState().addItem(product());
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(JSON.stringify({ products: [product({ stockQuantity: 0, inStock: false })] }));
    try {
      await useCartStore.getState().refreshInventory();
      if (removal === 'removeItem') useCartStore.getState().removeItem('shirt');
      else useCartStore.getState().removePurchasedItems(useCartStore.getState().items);
      useCartStore.getState().addItem(product({ stockQuantity: 5 }));
      expect(useCartStore.getState().items).toHaveLength(1);
      expect(useCartStore.getState().items[0].product.stockQuantity).toBe(5);
    } finally { globalThis.fetch = originalFetch; }
  });
}

test('a product added during a stock check is checked before the shared request resolves', async () => {
  useCartStore.getState().addItem(product());
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  const calls: string[][] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const ids = new URL(String(input), 'http://localhost').searchParams.getAll('id'); calls.push(ids);
    if (calls.length === 1) await pending;
    return new Response(JSON.stringify({ products: ids.map(id => product({ id, stockQuantity: 4 })) }));
  };
  try {
    const check = useCartStore.getState().refreshInventory();
    useCartStore.getState().addItem(product({ id: 'new-shirt' }));
    const shared = useCartStore.getState().refreshInventory();
    release(); await Promise.all([check, shared]);
    expect(calls).toEqual([['shirt'], ['new-shirt']]);
    expect(useCartStore.getState().items.every(item => item.product.stockQuantity === 4)).toBe(true);
    expect(useCartStore.getState().inventoryValidatedKey).not.toBeNull();
  } finally { release(); globalThis.fetch = originalFetch; }
});
