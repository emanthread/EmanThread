import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

const source = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

test.describe("mobile catalog header", () => {
  test("puts departments and their catalog menu beneath the mobile header", () => {
    const header = source("components/layout/header.tsx");
    const mobileDepartments = source(
      "components/layout/catalog-mobile-department-menu.tsx"
    );
    const utilityDrawer = source("components/layout/catalog-mobile-menu.tsx");

    expect(header).toContain("<CatalogMobileDepartmentMenu");
    expect(header.indexOf("<CatalogMobileDepartmentMenu")).toBeGreaterThan(
      header.indexOf("catalogStyles.mobileBar")
    );
    expect(mobileDepartments).toContain('aria-label="Mobile departments"');
    expect(mobileDepartments).toContain("`${openDepartment.label} categories`");
    expect(mobileDepartments).toContain('aria-label={`${openDepartment.label} categories`}');
    expect(mobileDepartments).toContain('role="region"');
    expect(utilityDrawer).not.toContain('aria-label="Mobile catalog"');
    expect(utilityDrawer).toContain("Open account and support menu");
  });

  test("shows only published departments, categories, and subcategories", () => {
    const mobileDepartments = source(
      "components/layout/catalog-mobile-department-menu.tsx"
    );

    expect(mobileDepartments).toContain(
      'isPublishedCatalogHref(`/${department.id}`, publishedPaths)'
    );
    expect(mobileDepartments).toContain(
      "isPublishedCatalogHref(section.href, publishedPaths)"
    );
    expect(mobileDepartments).toContain(
      "isPublishedCatalogHref(item.href, publishedPaths)"
    );
    expect(mobileDepartments).toContain('item.visibility === "visible"');
  });

  test("uses touch-sized scroll rows and is hidden on desktop", () => {
    const css = source(
      "components/layout/catalog-mobile-department-menu.module.css"
    );

    expect(css).toContain("overflow-x: auto");
    expect(css).toContain("min-height: 44px");
    expect(css).toContain("-webkit-overflow-scrolling: touch");
    expect(css).toContain("@media (min-width: 1024px)");
    expect(css).toContain("display: none");
  });

  test("closes on navigation, outside press, escape, and desktop resize", () => {
    const mobileDepartments = source(
      "components/layout/catalog-mobile-department-menu.tsx"
    );

    expect(mobileDepartments).toContain("}, [pathname]);");
    expect(mobileDepartments).toContain(
      'document.addEventListener("pointerdown", handlePointerDown)'
    );
    expect(mobileDepartments).toContain('event.key === "Escape"');
    expect(mobileDepartments).toContain("window.innerWidth >= 1024");
  });
});
