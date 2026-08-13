import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("critical brand assets stay lightweight", () => {
  const limits: Record<string, number> = {
    "public/logo.jpg": 100_000,
    "public/logo-circle.jpg": 100_000,
    "public/logo-circle.png": 100_000,
    "public/icons/icon-512.png": 100_000,
    // Retains the 2000px transparent source used by printable measurement cards.
    "public/logo.png": 500_000,
  };

  for (const [path, maximumBytes] of Object.entries(limits)) {
    expect(statSync(resolve(process.cwd(), path)).size, path).toBeLessThan(maximumBytes);
  }
});

test("storefront defers non-critical media and interaction bundles", () => {
  const hero = source("components/home/hero-section.tsx");
  const header = source("components/layout/header.tsx");
  const cartDrawer = source("components/cart/lazy-cart-drawer.tsx");
  const productResults = source("components/catalog/catalog-product-results.tsx");

  expect(hero).toContain("visibleSlideIndexes");
  expect(hero).toContain("mediaPreloadReady");
  expect(header).toContain('dynamic(');
  expect(header).toContain("DeferredSearchModal");
  expect(cartDrawer).toContain('dynamic(');
  expect(cartDrawer).toContain("isOpen || hasItems");
  expect(productResults).toContain("priority={index < 2}");
});

test("editable public content is cached and explicitly invalidated", () => {
  const content = source("lib/content-pages.ts");
  const adminRoute = source("app/api/admin/content-pages/route.ts");

  expect(content).toContain('tags: ["content-pages"]');
  expect(adminRoute).toContain('revalidateTag("content-pages", { expire: 0 })');
  expect(adminRoute).toContain("revalidatePath(contentPathByKey[key], \"page\")");
});
