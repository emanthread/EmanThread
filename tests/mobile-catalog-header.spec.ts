import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

const source = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

test.describe("mobile catalog header", () => {
  test("puts departments and their catalog menu beneath the mobile header", () => {
    const header = source("components/layout/header.tsx");
    const mobileDepartments = source(
      "components/layout/catalog-mobile-nav.tsx"
    );

    expect(header).toContain("<CatalogMobileNav");
    expect(header.indexOf("<CatalogMobileNav")).toBeGreaterThan(
      header.indexOf("catalogStyles.mobileBar")
    );
    expect(mobileDepartments).toContain('aria-label="Departments"');
    expect(mobileDepartments).toContain('aria-label="Navigation menu"');
    expect(mobileDepartments).toContain('role="dialog"');
    expect(mobileDepartments).toContain("activeSection.groups");
  });

  test("shows only published departments, categories, and subcategories", () => {
    const mobileDepartments = source(
      "components/layout/catalog-mobile-nav.tsx"
    );

    expect(mobileDepartments).toContain(
      'isPublishedCatalogHref(`/${dept.id}`, publishedPaths)'
    );
    expect(mobileDepartments).toContain(
      "isPublishedCatalogHref(s.href, publishedPaths)"
    );
    expect(mobileDepartments).toContain(
      "isPublishedCatalogHref(item.href, publishedPaths)"
    );
    expect(mobileDepartments).toContain('item.visibility === "visible"');
  });

  test("uses touch-sized scroll rows and is hidden on desktop", () => {
    const css = source(
      "components/layout/catalog-mobile-nav.module.css"
    );

    expect(css).toContain("overflow-x: auto");
    expect(css).toContain("min-height: 44px");
    expect(css).toContain("-webkit-overflow-scrolling: touch");
    expect(css).toContain("@media (min-width: 1024px)");
    expect(css).toContain("display: none");
  });

  test("closes on navigation, outside press, escape, and desktop resize", () => {
    const mobileDepartments = source(
      "components/layout/catalog-mobile-nav.tsx"
    );

    expect(mobileDepartments).toContain("}, [pathname]);");
    expect(mobileDepartments).toContain('onClick={close}');
    expect(mobileDepartments).toContain('e.key !== "Escape"');
    expect(mobileDepartments).toContain("window.innerWidth >= 1024");
  });
});
