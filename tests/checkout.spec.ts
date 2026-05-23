import { test, expect } from "@playwright/test";

test.describe("Checkout Flow", () => {
  test("guest user can place a COD order end-to-end", async ({ page }) => {
    // 1. Navigate to shop
    await page.goto("/shop");
    await expect(page.locator("text=Shop Collection")).toBeVisible();

    // Wait for products to load
    await expect(page.locator('[class*="grid"] >> a >> img').first()).toBeVisible({ timeout: 10000 });

    // 2. Click first product
    const firstProductLink = page.locator('a[href^="/product/"]').first();
    await firstProductLink.click();

    // 3. Wait for product detail page
    await expect(page).toHaveURL(/.*\/product\/.+/, { timeout: 10000 });
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 10000 });

    // 4. Add to cart from product detail page
    const addToCartBtn = page.locator("main").locator("button", { hasText: "Add to Cart" }).first();
    await expect(addToCartBtn).toBeVisible({ timeout: 10000 });
    await addToCartBtn.click();

    // 5. Go to checkout
    await page.goto("/checkout");

    // Wait for checkout form
    await expect(page.locator("text=Contact Information")).toBeVisible();

    // 6. Fill shipping form
    await page.fill('input[name="firstName"]', "Test");
    await page.fill('input[name="lastName"]', "User");
    await page.fill('input[name="email"]', "test-checkout@example.com");
    await page.fill('input[name="phone"]', "+92 300 1234567");
    await page.fill('input[name="address"]', "123 Test Street");
    await page.fill('input[name="city"]', "Lahore");
    await page.fill('input[name="province"]', "Punjab");
    await page.fill('input[name="postalCode"]', "54000");

    // 7. Select COD (should be default, but ensure it's checked)
    const codRadio = page.locator('input[value="cod"]');
    await codRadio.check();

    // 8. Submit order
    const placeOrderBtn = page.locator("button", { hasText: "Place Order" });
    await placeOrderBtn.click();

    // 9. Verify order confirmation
    await expect(page.locator("text=Thank You for Your Order!")).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=Order Number")).toBeVisible();

    // Verify order number is displayed
    const orderNumber = page.locator("p.font-mono");
    await expect(orderNumber).not.toBeEmpty();
  });
});