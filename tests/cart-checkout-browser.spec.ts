import { expect, test, type Page } from '@playwright/test';
import type { Product } from '../lib/data';
const shirt: Product = { id: 'test-shirt', name: 'Test Shirt', price: 1000, description: '', longDescription: '', fabricType: 'Cotton', color: 'Blue', colorHex: '#0000ff', images: ['/placeholder.jpg'], inStock: true, stockQuantity: 10, sku: 'SHIRT' };
const other: Product = { ...shirt, id: 'other-shirt', name: 'Other Shirt' };
async function setup(page: Page, products: Product[] = [shirt, other], inventoryFails = false) {
  await page.addInitScript(({ shirt, other }) => {
    if (!localStorage.getItem('eman-threads-cart')) localStorage.setItem('eman-threads-cart', JSON.stringify({ version: 5, state: { items: [{ lineId: shirt.id, product: shirt, quantity: 2 }, { lineId: other.id, product: other, quantity: 1 }] } }));
  }, { shirt, other });
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/cart/inventory') return route.fulfill({ status: inventoryFails ? 503 : 200, json: inventoryFails ? { error: 'Offline' } : { products } });
    if (path === '/api/auth/session') return route.fulfill({ json: null });
    if (path === '/api/shipping/zone') return route.fulfill({ json: { quote: { shippingCost: 350, estimatedDays: '3-5 business days', name: 'Test zone' } } });
    if (path === '/api/cart/apply-discount') {
      const data = route.request().postDataJSON();
      const valid = data.cartItems.every((item: any) => item.product?.id && typeof item.product.price === 'number');
      return route.fulfill({ status: valid ? 200 : 400, json: valid ? { discountAmount: 200 } : { error: 'Product is required' } });
    }
    if (path === '/api/orders' && route.request().method() === 'POST') return route.fulfill({ json: { id: 'test-order', orderNumber: 'TEST-1' } });
    if (path === '/api/products') return route.fulfill({ json: { products: [], total: 0 } });
    if (path === '/api/stitching-prices') return route.fulfill({ json: [] });
    return route.fulfill({ json: {} });
  });
}
async function address(page: Page) {
  await page.locator('#firstName').fill('Test'); await page.locator('#lastName').fill('Shopper');
  await page.locator('#email').fill('test@example.com'); await page.locator('#phone').fill('03001234567');
  await page.locator('#address').fill('Test address'); await page.locator('#city').fill('Lahore'); await page.locator('#province').fill('Punjab');
}

test('stock-check failure blocks proceeding from the cart', async ({ page }) => {
  await setup(page, [], true); await page.goto('/cart');
  await expect(page.getByRole('main').getByRole('button', { name: 'Proceed to Checkout', exact: true })).toBeDisabled();
  await expect(page.getByRole('main').getByText('Unable to check current stock. Please try again.', { exact: false })).toBeVisible();
});
test('unselected unavailable items do not block buying the available selection', async ({ page }) => {
  await setup(page, [shirt, { ...other, inStock: false, stockQuantity: 0 }]); await page.goto('/checkout');
  await address(page);
  await expect(page.getByText('2 of 2 items selected', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Place Order/ })).toBeDisabled();
  await page.getByRole('checkbox', { name: 'Remove Other Shirt from this checkout', exact: true }).click();
  await expect(page.getByRole('button', { name: /Place Order/ })).toBeEnabled();
});
test('partial checkout preserves the unpurchased line', async ({ page }) => {
  await setup(page); await page.goto('/checkout'); await address(page);
  await page.getByRole('checkbox', { name: 'Remove Other Shirt from this checkout', exact: true }).click();
  const request = page.waitForRequest(request => request.url().endsWith('/api/orders') && request.method() === 'POST');
  await page.getByRole('button', { name: /Place Order/ }).click();
  expect((await request).postDataJSON().items.map((item: any) => item.productId)).toEqual(['test-shirt']);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('eman-threads-cart')!).state.items.map((item: any) => item.lineId))).toEqual(['other-shirt']);
});
test('checkout applies coupons using the API product contract', async ({ page }) => {
  await setup(page); await page.goto('/checkout');
  await page.getByPlaceholder('Coupon code').fill('TEST'); await page.getByRole('button', { name: 'Apply', exact: true }).click();
  await expect(page.getByText('Coupon applied!', { exact: true })).toBeVisible();
});

test('stock that sells out just before submission prevents any order request', async ({ page }) => {
  await setup(page);
  let soldOut = false;
  let orderRequests = 0;
  await page.route('**/api/cart/inventory?**', route => route.fulfill({ json: { products: [soldOut ? { ...shirt, inStock: false, stockQuantity: 0 } : shirt, other] } }));
  await page.route('**/api/orders', route => { orderRequests++; return route.fulfill({ json: { id: 'test-order' } }); });
  await page.goto('/checkout'); await address(page);
  await expect(page.getByRole('button', { name: /Place Order/ })).toBeEnabled();
  soldOut = true;
  await page.getByRole('button', { name: /Place Order/ }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'A selected product or option is out of stock.' })).toBeVisible();
  expect(orderRequests).toBe(0);
});
test('a price change during submission requires reviewing the updated total', async ({ page }) => {
  await setup(page);
  let changed = false;
  let orderRequests = 0;
  await page.route('**/api/cart/inventory?**', route => route.fulfill({ json: { products: [{ ...shirt, price: changed ? 1500 : 1000 }, other] } }));
  await page.route('**/api/orders', route => { orderRequests++; return route.fulfill({ json: { id: 'test-order' } }); });
  await page.goto('/checkout'); await address(page);
  await expect(page.getByRole('button', { name: /Place Order/ })).toBeEnabled();
  changed = true;
  await page.getByRole('button', { name: /Place Order/ }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Prices or available quantities changed.' })).toBeVisible();
  expect(orderRequests).toBe(0);
});
test('changing checkout selection invalidates the previous coupon amount', async ({ page }) => {
  await setup(page); await page.goto('/checkout'); await address(page);
  await page.getByPlaceholder('Coupon code').fill('TEST'); await page.getByRole('button', { name: 'Apply', exact: true }).click();
  await expect(page.getByText('Coupon applied!', { exact: true })).toBeVisible();
  await page.getByRole('checkbox', { name: 'Remove Other Shirt from this checkout', exact: true }).click();
  await expect(page.getByText('Cart or coupon changed. Apply the coupon again.')).toBeVisible();
  await expect(page.getByText('Coupon applied!', { exact: true })).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Place Order - PKR 2,350', exact: true })).toBeEnabled();
});


test('checkout controls stay locked while the final stock check is pending', async ({ page }) => {
  await setup(page);
  let hold = false;
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/cart/inventory?**', async route => {
    if (hold) await pending;
    await route.fulfill({ json: { products: [shirt, other] } });
  });
  await page.goto('/checkout'); await address(page);
  await expect(page.getByRole('button', { name: /Place Order/ })).toBeEnabled();
  hold = true;
  await page.getByRole('button', { name: /Place Order/ }).click();
  try {
    await expect(page.getByRole('checkbox', { name: 'Remove Other Shirt from this checkout', exact: true })).toBeDisabled();
    await expect(page.locator('#address')).toBeDisabled();
  } finally { release(); }
});


test('entering checkout rechecks stock even when the validated cart has not changed', async ({ page }) => {
  await setup(page);
  let soldOut = false;
  await page.route('**/api/cart/inventory?**', route => route.fulfill({ json: { products: [soldOut ? { ...shirt, inStock: false, stockQuantity: 0 } : shirt, other] } }));
  await page.goto('/cart');
  const proceed = page.getByRole('main').getByRole('link', { name: 'Proceed to Checkout', exact: true });
  await expect(proceed).toBeVisible();
  soldOut = true;
  await proceed.click();
  await expect(page.getByText('Cannot place order', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: /Place Order/ })).toBeDisabled();
});
