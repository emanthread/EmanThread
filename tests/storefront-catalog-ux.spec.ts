import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import {
  CATALOG_PRICE_MAX,
  CATALOG_PRICE_MIN,
  CATALOG_PRICE_STEP,
  CATALOG_SEASON_OPTIONS,
  supportsSeasonFilter,
} from "../lib/catalog-filter-options";
import {
  catalogSearchHref,
  shouldShowCatalogNavigation,
} from "../lib/navigation/storefront-routes";

const source = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

test.describe("storefront catalog UX", () => {
  test("uses the approved price range and complete clothing season list", () => {
    expect([CATALOG_PRICE_MIN, CATALOG_PRICE_MAX, CATALOG_PRICE_STEP]).toEqual([
      0,
      10_000,
      500,
    ]);
    expect(CATALOG_SEASON_OPTIONS).toEqual([
      "Summer",
      "Winter",
      "Eid",
      "Festive",
      "All Season",
      "Casual",
      "Formal",
      "Wedding",
    ]);
  });

  test("shows seasons on clothing landings and hides them on non-clothing nodes", () => {
    expect(supportsSeasonFilter("/women", [])).toBe(true);
    expect(
      supportsSeasonFilter("/men/ready-to-wear/kurta", ["READY_TO_WEAR"])
    ).toBe(true);
    expect(supportsSeasonFilter("/teens/teen-girls", ["TEENS"])).toBe(true);
    expect(supportsSeasonFilter("/fragrance-beauty", ["FRAGRANCE"])).toBe(
      false
    );
    expect(
      supportsSeasonFilter("/men/cast-crew/accessories/perfume", [
        "FRAGRANCE",
      ])
    ).toBe(false);
  });

  test("hides catalog navigation throughout account, stitching, and checkout flows", () => {
    for (const pathname of [
      "/account",
      "/account/settings",
      "/account/measurements",
      "/checkout",
      "/checkout/review",
      "/measurements",
      "/settings",
      "/stitching",
    ]) {
      expect(shouldShowCatalogNavigation(pathname), pathname).toBe(false);
    }

    expect(shouldShowCatalogNavigation("/women/ready-to-wear")).toBe(true);
    expect(shouldShowCatalogNavigation("/accounting")).toBe(true);
  });

  test("keeps global searches inside canonical department routes", () => {
    expect(catalogSearchHref("/men/ready-to-wear", " black kurta ")).toBe(
      "/men?q=black%20kurta"
    );
    expect(catalogSearchHref("/checkout", "perfume")).toBe(
      "/women?q=perfume"
    );
  });

  test("removes duplicate catalog navigation and supplies a scrollable filter panel", () => {
    const filters = source("components/catalog/catalog-filters.tsx");

    expect(filters).not.toContain("Department & Collection");
    expect(filters).not.toContain("Select a new department or subcategory");
    expect(filters).toContain("overflow-y-auto");
    expect(filters).toContain('aria-label="Scroll filters up"');
    expect(filters).toContain('aria-label="Scroll filters down"');
  });

  test("puts search, grid density, and sorting together above results", () => {
    const results = source("components/catalog/catalog-product-results.tsx");

    expect(results).toContain('placeholder="Search products..."');
    expect(results).toContain('aria-label="Product grid size"');
    expect(results).toContain('<option value="featured">Featured</option>');
    expect(results).toContain('<option value="trending">Trending</option>');
  });

  test("keeps image browsing in quick view and product details, not listing cards", () => {
    const card = source("components/product/product-card.tsx");
    const quickView = source("components/product/quick-view-modal.tsx");
    const productDetail = source("app/product/[id]/product-page-client.tsx");

    expect(card).not.toContain("Show previous product image");
    expect(card).not.toContain("Show next product image");
    expect(card).not.toContain("alternate view");
    expect(quickView).toContain("setSelectedImage");
    expect(productDetail).toContain("Show previous product image");
    expect(productDetail).toContain("Show next product image");
  });

  test("retires the generic shop page without breaking old bookmarks", () => {
    const retiredShop = source("app/shop/page.tsx");
    const sitemap = source("app/sitemap.ts");

    expect(retiredShop).toContain("permanentRedirect(DEFAULT_CATALOG_PATH)");
    expect(sitemap).not.toContain("`${siteUrl}/shop");
  });

  test("defaults the approved catalog on while preserving explicit rollback switches", () => {
    const flags = source("lib/feature-flags.ts");

    expect(flags).toContain(
      'CATALOG_HEADER_V1: process.env.NEXT_PUBLIC_CATALOG_HEADER_V1 !== "false"'
    );
    expect(flags).toContain(
      'CATALOG_PAGES_V1: process.env.NEXT_PUBLIC_CATALOG_PAGES_V1 !== "false"'
    );
  });
});
