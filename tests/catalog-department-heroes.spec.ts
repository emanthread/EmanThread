import { expect, test } from "@playwright/test";

const DEPARTMENT_ROOTS = [
  "/men",
  "/teens",
  "/fragrance-beauty",
] as const;

for (const path of DEPARTMENT_ROOTS) {
  test(`${path} renders its hero before catalog controls without a node banner`, async ({
    page,
  }) => {
    const response = await page.goto(path);

    expect(response?.ok()).toBe(true);
    await expect(page.getByTestId("hero-section")).toBeVisible();
    await expect(page.getByTestId("catalog-node-banner")).toHaveCount(0);
    await expect(
      page.locator('section[aria-labelledby="catalog-products-heading"]')
    ).toBeVisible();

    const heroComesFirst = await page.evaluate(() => {
      const hero = document.querySelector('[data-testid="hero-section"]');
      const products = document.querySelector(
        'section[aria-labelledby="catalog-products-heading"]'
      );
      return Boolean(
        hero &&
          products &&
          hero.compareDocumentPosition(products) &
            Node.DOCUMENT_POSITION_FOLLOWING
      );
    });
    expect(heroComesFirst).toBe(true);
  });
}

for (const path of ["/teens/teen-girls", "/women/ready-to-wear"] as const) {
  test(`${path} keeps the CatalogNode banner and does not render a department hero`, async ({
    page,
  }) => {
    const response = await page.goto(path);

    expect(response?.ok()).toBe(true);
    await expect(page.getByTestId("hero-section")).toHaveCount(0);
    await expect(page.getByTestId("catalog-node-banner")).toBeVisible();
  });
}


test("/shop keeps Women products without the retired department hero", async ({ page }) => {
  const response = await page.goto("/shop");
  expect(response?.ok()).toBe(true);
  await expect(page.getByTestId("hero-section")).toHaveCount(0);
  await expect(page.locator('section[aria-labelledby="catalog-products-heading"]')).toBeVisible();
});


test("the retired Women URL redirects before rendering the old catalog", async ({ request }) => {
  const response = await request.get("/women", { maxRedirects: 0 });
  expect(response.status()).toBe(308);
  expect(response.headers()["location"]).toBe("/");

  const filtered = await request.get("/women?q=linen", { maxRedirects: 0 });
  expect(filtered.status()).toBe(308);
  expect(filtered.headers()["location"]).toBe("/shop?q=linen");
});
