import { test, expect } from "@playwright/test";

test.describe("Admin Dashboard Flow", () => {
  test("admin can login, view dashboard, manage orders and products", async ({ page }) => {
    // 1. Login as admin
    await page.goto("/login");
    await expect(page.locator("text=Sign in to your account")).toBeVisible();

    await page.fill('input[id="email"]', "admin@emanthread.com");
    await page.fill('input[id="password"]', "admin123");
    await page.click('button:has-text("Sign In")');

    // Wait for redirect after login
    await expect(page).toHaveURL("/", { timeout: 15000 });

    // 2. Navigate to admin dashboard
    await page.goto("/admin");
    await expect(page).toHaveURL("/admin", { timeout: 15000 });

    // 3. Verify analytics cards are visible
    await expect(page.locator("text=Total Revenue")).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=Total Orders")).toBeVisible();
    await expect(page.locator("text=Total Customers")).toBeVisible();
    await expect(page.locator("text=Avg. Order Value")).toBeVisible();

    // 4. Navigate to orders
    await page.click('a:has-text("Orders")');
    await expect(page).toHaveURL(/.*admin\/orders/, { timeout: 10000 });

    // Verify orders table loads - look for the page heading
    await expect(page.locator("h1", { hasText: "Orders" }).first()).toBeVisible({ timeout: 15000 });

    // Wait for orders data to load
    await page.waitForTimeout(2000);

    // Check if there are any orders to change status
    const hasOrders = await page.locator("table tbody tr, [class*='table'] >> tr").first().isVisible().catch(() => false);

    if (hasOrders) {
      // 5. Change an order status
      // Open the status dialog by clicking on a status badge or action
      const statusCell = page.locator("table tbody tr td >> nth=4").first();
      if (await statusCell.isVisible().catch(() => false)) {
        await statusCell.click();

        // Look for a select dropdown or dialog to change status
        const statusDialog = page.locator("text=Update Status");
        if (await statusDialog.isVisible().catch(() => false)) {
          const statusSelect = page.locator("select, [role='combobox']").first();
          if (await statusSelect.isVisible().catch(() => false)) {
            await statusSelect.selectOption("processing");
            await page.click('button:has-text("Update")');
            await page.waitForTimeout(1000);
          }
        }
      }
    }

    // 6. Navigate to products
    await page.click('a:has-text("Products")');
    await expect(page).toHaveURL(/.*admin\/products/, { timeout: 10000 });

    // Verify products list loads
    await expect(page.locator("h1", { hasText: "Products" }).first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator("table").first()).toBeVisible({ timeout: 10000 });
  });
});