import { expect, test } from "@playwright/test";
import { catalogMenu } from "../lib/navigation/catalog-menu";

test.beforeEach(async ({ page, baseURL }) => {
  if (!baseURL?.includes("localhost")) return;
  const paths = catalogMenu.flatMap((department) => [
    `/${department.id}`, ...department.sections.map((section) => section.href).filter(Boolean),
  ]);
  await page.route('**/api/catalog/navigation', (route) => route.fulfill({ json: { paths } }));
});

for (const [path, department] of [
  ["/", "women"], ["/women", "women"], ["/shop", "women"],
  ["/men", "men"], ["/fragrance-beauty", "fragrance-beauty"], ["/teens", "teens"],
] as const) {
  test(`${path} shows the current department homepage before and after refresh`, async ({ page }) => {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#home-shop-by-category')).toBeVisible();
    await expect(page.locator('div[data-home-department]')).toHaveAttribute('data-home-department', department);
    await expect(page.locator('section[aria-labelledby="catalog-products-heading"]')).toHaveCount(0);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('div[data-home-department]')).toHaveAttribute('data-home-department', department);
    await expect(page.locator('#home-trending')).toBeVisible();
    await expect(page.getByTestId('hero-section')).toHaveAttribute('data-department', department);
    await expect(page.locator('section[aria-labelledby="catalog-products-heading"]')).toHaveCount(0);
  });
}

test('footer department links open the current layout with the correct department', async ({ page }) => {
  for (const [label, department] of [
    ["Men", "men"], ["Teens", "teens"], ["Fragrance & Beauty", "fragrance-beauty"], ["Women", "women"],
  ] as const) {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.locator('footer').getByRole('link', { name: label, exact: true }).click();
    await expect(page.locator('div[data-home-department]')).toHaveAttribute('data-home-department', department);
    await expect(page.locator('#home-shop-by-category')).toBeVisible();
    await expect(page.locator('section[aria-labelledby="catalog-products-heading"]')).toHaveCount(0);
  }
});

test('header selection survives refresh and browser Back and Forward', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const nav = page.getByRole('navigation', { name: 'Catalog departments', exact: true });
  await nav.getByRole('link', { name: /^men$/i }).click();
  await expect(page).toHaveURL(/\/men$/);
  await expect(page.locator('div[data-home-department]')).toHaveAttribute('data-home-department', 'men');
  await nav.getByRole('link', { name: /^teens$/i }).click();
  await expect(page).toHaveURL(/\/teens$/);
  await page.goBack();
  await expect(page.locator('div[data-home-department]')).toHaveAttribute('data-home-department', 'men');
  await page.goForward();
  await expect(page.locator('div[data-home-department]')).toHaveAttribute('data-home-department', 'teens');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('div[data-home-department]')).toHaveAttribute('data-home-department', 'teens');
  await page.getByRole('link', { name: 'Eman Thread home', exact: true }).filter({ visible: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('div[data-home-department]')).toHaveAttribute('data-home-department', 'women');
});


test('returning from a category restores the selected department hero and collections', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('navigation', { name: 'Catalog departments', exact: true })
    .getByRole('link', { name: /^men$/i }).click();
  await expect(page.getByTestId('hero-section')).toHaveAttribute('data-department', 'men');
  await page.locator('section[aria-labelledby="home-shop-by-category"] a[href^="/men/"]').first().click();
  await expect(page).toHaveURL(/\/men\/.+/);
  await page.goBack();
  await expect(page.locator('div[data-home-department]')).toHaveAttribute('data-home-department', 'men');
  await expect(page.getByTestId('hero-section')).toHaveAttribute('data-department', 'men');
});

test('tracking parameters retain the current department layout', async ({ page }) => {
  await page.goto('/men?utm_source=newsletter', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#home-shop-by-category')).toBeVisible();
  await expect(page.locator('div[data-home-department]')).toHaveAttribute('data-home-department', 'men');
});

// Run with a database-backed fixture or against the read-only live storefront.
test('full Women inventory keeps the current cards, filter and pagination controls', async ({ page }) => {
  await page.goto('/shop?view=all', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('section[aria-labelledby="catalog-products-heading"]')).toBeVisible();
  await expect(page.locator('main')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  const firstProduct = page.locator('main a[href^="/product/"]').first();
  await expect(firstProduct).toBeVisible();
  expect(await firstProduct.evaluate((link) => link.closest('div.group')?.classList.contains('rounded-none'))).toBe(true);
  await expect(page.getByRole('link', { name: 'Next page', exact: true })).toHaveAttribute('href', /view=all/);
  await expect(page.getByRole('button', { name: 'Filter and Sort', exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Filter and Sort', exact: false }).click();
  const form = page.getByRole('form', { name: 'Filter catalog products' });
  await expect(form).toHaveAttribute('action', '/shop');
  await expect(form.locator('input[name="view"]')).toHaveValue('all');
  await expect(form.getByRole('link', { name: 'Clear', exact: true })).toHaveAttribute('href', '/shop?view=all');
});

test('mobile department selection survives refresh', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('navigation', { name: 'Mobile top departments navigation', exact: true })
    .getByRole('link', { name: /^men$/i }).click();
  await expect(page).toHaveURL(/\/men$/);
  await expect(page.locator('div[data-home-department]')).toHaveAttribute('data-home-department', 'men');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('#home-shop-by-category')).toBeVisible();
  await expect(page.getByTestId('hero-section')).toHaveAttribute('data-department', 'men');
});

test('homepage product opens without the error page', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const firstProduct = page.locator('main a[href^="/product/"]').first();
  await firstProduct.click();
  await expect(page).toHaveURL(/\/product\//);
  await expect(page.locator('main h1')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Something went wrong', exact: true })).toHaveCount(0);
});
