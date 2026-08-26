import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import {
  isPublishedCatalogHref,
  publishedCatalogPathSet,
} from "../lib/navigation/published-catalog";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test.describe("published catalog navigation", () => {
  test("shows only exact paths returned by the published CatalogNode hierarchy", () => {
    const published = publishedCatalogPathSet([
      "/teens",
      "/teens/teen-girls",
      "/teens/teen-girls/kurti",
    ]);

    expect(isPublishedCatalogHref("/teens/teen-girls/kurti", published)).toBe(
      true
    );
    expect(
      isPublishedCatalogHref("/teens/teen-girls/ready-to-wear", published)
    ).toBe(false);
  });

  test("normalizes case and trailing slashes without allowing descendants", () => {
    const published = publishedCatalogPathSet(["/Women/Ready-To-Wear/"]);

    expect(isPublishedCatalogHref("/women/ready-to-wear", published)).toBe(true);
    expect(isPublishedCatalogHref("/women/ready-to-wear/kurta", published)).toBe(
      false
    );
  });

  test("desktop, mobile, and hover cards all require a published destination", () => {
    const desktop = source("components/layout/catalog-header-menu.tsx");
    const mobile = source("components/layout/catalog-mobile-menu.tsx");

    expect(desktop).toContain("isPublishedCatalogHref(item.href, publishedPaths)");
    expect(desktop).toContain("isPublishedCatalogHref(href, publishedPaths)");
    expect(mobile).toContain("isPublishedCatalogHref(");
    expect(mobile).toContain("item.href,");
  });

  test("uses the cached database-backed feed and excludes hidden paths from SEO", () => {
    const navigationApi = source("app/api/catalog/navigation/route.ts");
    const catalogDb = source("lib/db/catalog.ts");
    const sitemap = source("app/sitemap.ts");

    expect(navigationApi).toContain("getCachedPublishedCatalogSidebarNavigation");
    expect(navigationApi).toContain(
      '"Cache-Control": "private, max-age=0, must-revalidate"'
    );
    expect(catalogDb).toContain('tags: ["catalog-navigation"]');
    expect(sitemap).toContain("getPublishedCatalogSidebarNavigation");
    expect(sitemap).not.toContain("catalogMenu");
  });
});
