import { test, expect, type Page } from "@playwright/test";
import { encode } from "next-auth/jwt";

const product = {
  id: "mock-product", name: "Sample fabric", sku: "SAMPLE-1", slug: "sample-fabric",
  price: 1000, fabricType: "Cotton", color: "Blue", colorHex: "#0000ff",
  images: ["/logo.jpg", "/logo-circle.jpg"], inStock: true,
  stockQuantity: 10, lowStockThreshold: 2, description: "Sample fabric description",
  tags: [], categoryId: "legacy-category", createdAt: "2026-01-01", updatedAt: "2026-01-01",
};
const leaf = {
  id: "leaf", label: "1 Piece", path: "/women/unstitched/1-piece",
  productKind: "UNSTITCHED_FABRIC", isActive: true, isVisible: true,
  _count: { children: 0 },
};

async function openEditor(page: Page, assigned = false) {
  const saved: Record<string, unknown>[] = [];
  const user = { id: "test-admin", name: "Test Admin", email: "admin@example.test", role: "ADMIN", isVerified: true };
  const value = await encode({
    secret: "local-admin-regression-secret-never-use-in-production",
    salt: "authjs.session-token", token: user, maxAge: 3600,
  });
  await page.context().addCookies([{ name: "authjs.session-token", value, url: "http://localhost:3101", httpOnly: true }]);
  // No browser API request may reach the application or an external service.
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    let json: unknown = {};
    if (path === "/api/auth/session") json = { user, expires: "2099-01-01T00:00:00Z" };
    else if (path === "/api/user/profile") json = { ...user, addresses: [] };
    else if (path === "/api/admin/categories") json = [{ id: "legacy-category", name: "Cotton" }];
    else if (path === "/api/admin/fabric-types") json = [{ id: "cotton", name: "Cotton", isActive: true }];
    else if (path === "/api/admin/products/mock-product") json = product;
    else if (path === "/api/admin/catalog/nodes") json = { nodes: [
      { id: "women", label: "Women", path: "/women", isActive: true, isVisible: true, _count: { children: 1 } }, leaf,
    ] };
    else if (path === "/api/admin/catalog/assignments") json = { products: [{
      id: product.id, commerceProfile: null,
      catalogAssignments: assigned ? [
        { catalogNodeId: leaf.id, isPrimary: true, isFeatured: true, displayOrder: 4, catalogNode: leaf },
        { catalogNodeId: "secondary", isPrimary: false, isFeatured: false, displayOrder: 9, catalogNode: { ...leaf, id: "secondary" } },
      ] : [],
    }] };
    else if (path === "/api/admin/products/editor") {
      saved.push(route.request().postDataJSON());
      return route.fulfill({ status: 409, json: { error: "Mock save captured" } });
    }
    return route.fulfill({ status: 200, json });
  });
  await page.goto("/admin/products/mock-product/edit");
  await expect(page.locator("#name")).toHaveValue(product.name);
  await expect(page.getByRole("button", { name: "Save product", exact: true })).toBeEnabled();
  return saved;
}

for (const assigned of [false, true]) {
  test(assigned ? "unrelated edits preserve all catalog assignments" : "legacy products save without forced recategorization", async ({ page }) => {
    const saved = await openEditor(page, assigned);
    await expect(page.locator("#catalog-department")).toBeVisible();
    await page.locator("#name").fill("Updated sample fabric");
    await page.getByRole("button", { name: "Save product", exact: true }).click();
    await expect.poll(() => saved.length).toBe(1);
    expect(saved[0]).not.toHaveProperty("assignments");
    expect(saved[0]).toMatchObject({ product: { name: "Updated sample fabric", fabricType: "Cotton", color: "Blue", colorHex: "#0000ff" } });
  });
}

test("failed replacement keeps the old image; retrying the same file replaces only its slot", async ({ page }) => {
  await openEditor(page);
  let attempts = 0;
  await page.route("**/api/admin/upload", (route) => {
    attempts += 1;
    return attempts === 1
      ? route.fulfill({ status: 502, json: { error: "Mock upload failed" } })
      : route.fulfill({ status: 200, json: { url: "/logo-transparent.png" } });
  });
  const image = page.getByAltText("Product image 1", { exact: true });
  const second = page.getByAltText("Product image 2", { exact: true });
  const oldSource = await image.getAttribute("src");
  const secondSource = await second.getAttribute("src");
  const file = { name: "replacement.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXn8AAAAASUVORK5CYII=", "base64") };
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const chooserPromise = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Replace product image 1", exact: true }).click();
    await (await chooserPromise).setFiles(file);
    await expect.poll(() => attempts).toBe(attempt + 1);
    await expect(page.getByRole("button", { name: "Replace product image 1", exact: true })).toBeEnabled();
    if (attempt === 0) await expect(image).toHaveAttribute("src", oldSource!);
  }
  await expect(image).not.toHaveAttribute("src", oldSource!);
  await expect(image).toHaveAttribute("src", /logo-transparent/);
  await expect(second).toHaveAttribute("src", secondSource!);
});
