import { test, expect } from "@playwright/test";

test.describe("Admin Dashboard Flow", () => {
  test("admin can login and view dashboard, orders, and products", async ({ page }) => {
    const email = process.env.E2E_ADMIN_EMAIL;
    const password = process.env.E2E_ADMIN_PASSWORD;
    test.skip(!email || !password, "E2E admin credentials are not configured");

    // 1. Login as admin
    await page.goto("/admin/login");
    await expect(page.getByRole("heading", { name: "Admin Login" })).toBeVisible();

    await page.fill("#admin-email", email!);
    await page.fill("#admin-password", password!);
    await page.getByRole("button", { name: "Sign In" }).click();

    // Wait for redirect after login
    await expect(page).toHaveURL("/admin", { timeout: 15000 });

    // 2. Verify analytics cards are visible
    await expect(page.locator("text=Total Revenue")).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=Total Orders")).toBeVisible();
    await expect(page.locator("text=Total Customers")).toBeVisible();
    await expect(page.locator("text=Avg. Order Value")).toBeVisible();

    // 3. Navigate to orders
    await page.click('a:has-text("Orders")');
    await expect(page).toHaveURL(/.*admin\/orders/, { timeout: 10000 });

    // Verify orders table loads - look for the page heading
    await expect(page.locator("h1", { hasText: "Orders" }).first()).toBeVisible({ timeout: 15000 });

    // 4. Navigate to products. This test is intentionally read-only.
    await page.click('a:has-text("Products")');
    await expect(page).toHaveURL(/.*admin\/products/, { timeout: 10000 });

    // Verify products list loads
    await expect(page.locator("h1", { hasText: "Products" }).first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator("table").first()).toBeVisible({ timeout: 10000 });
  });
});
