import { test, expect } from "@playwright/test";

test.describe("Authentication Flow", () => {
  const uniqueEmail = `test-auth-${Date.now()}@example.com`;
  const password = "TestPass123";
  const name = "Test AuthUser";

  test("user can register, login, access account, and logout", async ({ page }) => {
    // 1. Register new user
    await page.goto("/register");
    await expect(page.locator("text=Create your account")).toBeVisible();

    await page.fill('input[id="name"]', name);
    await page.fill('input[id="email"]', uniqueEmail);
    await page.fill('input[id="password"]', password);
    await page.fill('input[id="confirmPassword"]', password);

    // Accept terms — click the checkbox wrapper (not the label text which contains a link)
    await page.click('button[role="checkbox"]');

    // Submit registration
    await page.click('button:has-text("Create Account")');

    // 2. Verify redirect to home (after successful registration + auto-login)
    await expect(page).toHaveURL("/", { timeout: 30000 });

    // 3. Logout first to test login flow independently
    await page.goto("/account");
    // Account page should load since we're logged in — verify by URL (not redirected to login)
    await expect(page).toHaveURL("/account", { timeout: 10000 });
    // Verify a visible heading on account page
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 5000 });

    // Logout via the logout button
    const logoutBtn = page.locator("button", { hasText: /Log\s*out/i }).first();
    if (await logoutBtn.isVisible().catch(() => false)) {
      await logoutBtn.click();
      await page.waitForTimeout(1000);
    }

    // 4. Login with the credentials
    await page.goto("/login");
    await expect(page.locator("text=Sign in to your account")).toBeVisible();

    await page.fill('input[id="email"]', uniqueEmail);
    await page.fill('input[id="password"]', password);
    await page.click('button:has-text("Sign In")');

    // 5. Verify redirect after login
    await expect(page).toHaveURL("/", { timeout: 15000 });

    // 6. Verify account page loads
    await page.goto("/account");
    await expect(page).toHaveURL("/account", { timeout: 10000 });
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 5000 });

    // 7. Logout via NextAuth signout endpoint and verify redirect
    await page.goto("/api/auth/signout");
    // NextAuth v5 signout page shows a confirmation form — submit it
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*/, { waitUntil: "networkidle", timeout: 10000 });

    // After logout, navigating to account should redirect to login
    await page.goto("/account");
    await expect(page).toHaveURL(/.*login.*/, { timeout: 10000 });
  });
});