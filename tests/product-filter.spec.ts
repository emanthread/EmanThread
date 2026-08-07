import { expect, test } from "@playwright/test";

test.describe("catalog product controls", () => {
  test("searches and changes grid density from the canonical catalog toolbar", async ({
    page,
  }) => {
    await page.goto("/women");

    const search = page.getByPlaceholder("Search products...");
    await expect(search).toBeVisible();
    await search.fill("cotton");
    await search.press("Enter");
    await expect(page).toHaveURL(/\/women\?q=cotton/);

    const largerCards = page.getByRole("button", {
      name: "Show larger product cards",
    });
    await largerCards.click();
    await expect(largerCards).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator('[data-grid-density="comfortable"]')).toBeVisible();
  });

  test("keeps desktop filters independently scrollable", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 800 });
    await page.goto("/women");

    await expect(
      page.getByRole("button", { name: "Scroll filters up" })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Scroll filters down" })
    ).toBeVisible();
    await expect(
      page.getByLabel("Scrollable product filters")
    ).toHaveCSS("overflow-y", "auto");
  });
});
