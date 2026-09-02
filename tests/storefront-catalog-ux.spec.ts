import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import {
  CATALOG_PRICE_MAX,
  CATALOG_PRICE_MIN,
  CATALOG_PRICE_STEP,
  CATALOG_SEASON_OPTIONS,
  colorFilterCopy,
  supportsColorFilter,
  supportsOptionsFilter,
  supportsSeasonFilter,
} from "../lib/catalog-filter-options";
import {
  catalogDepartmentFromRootPath,
  catalogSearchHref,
  shouldShowCatalogNavigation,
} from "../lib/navigation/storefront-routes";
import { selectHeroSlidesForDepartment } from "../lib/hero-slide-targeting";
import type { HeroSlide } from "../lib/db/store-config";

const source = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

test.describe("storefront catalog UX", () => {
  test("resolves all department roots without treating subcategories as roots", () => {
    expect(catalogDepartmentFromRootPath("/women")).toBe("women");
    expect(catalogDepartmentFromRootPath("/men")).toBe("men");
    expect(catalogDepartmentFromRootPath("/teens")).toBe("teens");
    expect(catalogDepartmentFromRootPath("/fragrance-beauty")).toBe(
      "fragrance-beauty"
    );

    expect(catalogDepartmentFromRootPath("teens/")).toBe("teens");
    expect(catalogDepartmentFromRootPath("/teens/teen-girls")).toBeNull();
    expect(catalogDepartmentFromRootPath("/women/ready-to-wear")).toBeNull();
  });

  test("selects dedicated hero slides and only falls back to shared slides", () => {
    const slide = (
      id: string,
      department: HeroSlide["department"]
    ): HeroSlide => ({
      id,
      department,
      mediaType: "image",
      image: `/${id}.jpg`,
      title: id,
      subtitle: id,
      description: id,
      cta: "Shop",
      link: "/",
    });
    const shared = slide("shared", "all");
    const women = slide("women", "women");
    const teens = slide("teens", "teens");
    const slides = [shared, women, teens];

    expect(selectHeroSlidesForDepartment(slides, "women")).toEqual([women]);
    expect(selectHeroSlidesForDepartment(slides, "teens")).toEqual([teens]);
    expect(selectHeroSlidesForDepartment(slides, "men")).toEqual([shared]);
    expect(selectHeroSlidesForDepartment(slides, "fragrance-beauty")).toEqual([
      shared,
    ]);
    expect(selectHeroSlidesForDepartment([teens], "women")).toEqual([]);
  });

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

  test("applies explicit color and option filter policy by catalog type", () => {
    expect(supportsColorFilter("/women/ready-to-wear", "READY_TO_WEAR")).toBe(
      true
    );
    expect(
      supportsColorFilter(
        "/fragrance-beauty/fragrances/men/perfume",
        "FRAGRANCE"
      )
    ).toBe(false);
    expect(supportsColorFilter("/fragrance-beauty/skincare/face", "BEAUTY")).toBe(
      false
    );
    expect(
      supportsColorFilter("/fragrance-beauty/makeup/accessories", "ACCESSORY")
    ).toBe(false);
    expect(
      supportsColorFilter("/fragrance-beauty/makeup/lips/lipstick", "BEAUTY")
    ).toBe(true);
    expect(supportsColorFilter("/fragrance-beauty/new-in")).toBe(false);
    expect(supportsColorFilter("/fragrance-beauty")).toBe(true);
    expect(supportsColorFilter("/men/unstitched/exclusive-gift-box")).toBe(
      false
    );
    expect(supportsOptionsFilter("/men/unstitched/exclusive-gift-box")).toBe(
      false
    );
    expect(supportsOptionsFilter("/fragrance-beauty/fragrances/men/perfume")).toBe(
      true
    );
    expect(colorFilterCopy("/fragrance-beauty/makeup/lips/lipstick")).toEqual({
      label: "Shade",
      allLabel: "All shades",
    });
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

  test("removes duplicate catalog navigation and supplies a scrollable filter drawer", () => {
    const filters = source("components/catalog/catalog-filters.tsx");

    expect(filters).not.toContain("Department & Collection");
    expect(filters).not.toContain("Select a new department or subcategory");
    expect(filters).toContain("overflow-y-auto");
    expect(filters).toContain("<SheetContent");
    expect(filters).toContain("Filter and Sort");
  });

  test("routes header departments to catalog pages without changing hero tabs", () => {
    const desktopMenu = source("components/layout/catalog-header-menu.tsx");
    const mobileMenu = source(
      "components/layout/catalog-mobile-department-menu.tsx"
    );
    const hero = source("components/home/hero-section.tsx");

    expect(desktopMenu).toContain('href={`/${department.id}`}');
    expect(desktopMenu).toContain("onPointerEnter");
    expect(desktopMenu).not.toContain("eman-thread:hero-department");
    expect(mobileMenu).toContain("{department.label}");
    expect(mobileMenu).toContain('href={`/${openDepartment.id}`}');
    expect(mobileMenu).not.toContain("eman-thread:hero-department");
    expect(hero).toContain("window.addEventListener(\"eman-thread:hero-department\"");
    expect(hero).toContain("const selectDepartment = useCallback(");
    expect(hero).toContain("setActiveDepartment(department);");
  });

  test("keeps catalog department heroes configurable and above product controls", () => {
    const catalogPage = source("components/catalog/catalog-page.tsx");
    const catalogAdminSchema = source("app/api/admin/catalog/_shared.ts");
    const catalogAdmin = source(
      "app/admin/(dashboard)/catalog/catalog-assignment-client.tsx"
    );
    const headerMenu = source("components/layout/catalog-header-menu.tsx");

    expect(catalogAdminSchema).toContain("catalogNodeBannerImageSchema");
    expect(catalogAdminSchema).toContain("catalogNodeBannerAltSchema");
    expect(catalogAdmin).toContain("Category banner (optional)");
    expect(catalogAdmin).toContain("Banner image");
    expect(catalogPage).toContain(
      "const heroDepartment = catalogDepartmentFromRootPath(data.node.path)"
    );
    expect(catalogPage).toContain("initialDepartment={heroDepartment}");
    expect(catalogPage).toContain("!isDepartmentRoot && bannerImage");
    expect(catalogPage).toContain("{!isDepartmentRoot && bannerImage ? (");
    expect(catalogPage.indexOf("{!isDepartmentRoot && bannerImage ? (")).toBeLessThan(
      catalogPage.indexOf("<CatalogProductResults")
    );
    expect(headerMenu).toContain("const routeDepartmentId = departmentFromPathname");
    expect(headerMenu).toContain(
      "data-active={routeDepartmentId === department.id}"
    );
  });

  test("puts grid density and the filter/sort drawer above results", () => {
    const results = source("components/catalog/catalog-product-results.tsx");
    const filters = source("components/catalog/catalog-filters.tsx");

    expect(results).toContain('aria-label="Product grid view size"');
    expect(results).toContain("<CatalogFilters data={data} />");
    expect(filters).toContain('<option value="featured">Featured</option>');
    expect(filters).toContain('<option value="trending">Trending</option>');
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

  test("offers optional unstitched measurement selection from product through checkout", () => {
    const productDetail = source("app/product/[id]/product-page-client.tsx");
    const productSelector = source("components/stitching/stitching-profile-selector.tsx");
    const checkout = source("app/checkout/page.tsx");

    expect(productDetail).toContain("<StitchingProfileSelector");
    expect(productDetail).toContain("supportsStitching ? stitchingSelection : undefined");
    expect(productSelector).toContain("Fabric only — No stitching");
    expect(productSelector).toContain("+ Create new measurements");
    expect(checkout).toContain("+ Create New Profile");
    expect(checkout).toContain("isStitchingEligible(item)");
    expect(checkout).not.toContain("Auto-select default profile for all stitching items");
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
