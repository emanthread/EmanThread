import { expect, test } from '@playwright/test';

test('shows a retry action when the selected department product request fails', async ({ page }) => {
  let failRequests = true;
  await page.route('**/api/catalog/products?**', (route) =>
    failRequests ? route.abort() : route.fulfill({ json: { products: [] } }),
  );
  await page.goto('/');

  await expect(page.locator('[data-home-department="women"]')).toBeVisible();
  await page.getByRole('navigation', { name: 'Catalog departments' })
    .getByRole('link', { name: 'MEN', exact: true }).click();

  await expect(page.locator('[data-home-department="men"]')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retry products' }).first()).toBeVisible();

  failRequests = false;
  await page.getByRole('button', { name: 'Retry products' }).first().click();
  await expect(page.getByRole('button', { name: 'Retry products' })).toHaveCount(0);
  await expect(page.getByText('Products are coming soon.').first()).toBeVisible();
});