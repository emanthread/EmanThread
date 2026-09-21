import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import { isCatalogProductPath } from "../lib/shop-catalog-options";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("catalog products accepts department roots but still rejects unknown paths", () => {
  for (const path of ["/women", "/men", "/fragrance-beauty", "/teens"]) {
    expect(isCatalogProductPath(path), path).toBe(true);
  }
  expect(isCatalogProductPath("/unknown")).toBe(false);
  expect(source("app/api/catalog/products/route.ts")).toContain(
    "isCatalogProductPath(path)"
  );
});

test("admin polling tolerates cold starts without unhandled promise rejections", () => {
  const adminFetch = source("lib/admin-fetch.ts");
  const statsRoute = source("app/api/admin/measurements/stats/route.ts");
  const measurementsPage = source("app/admin/(dashboard)/measurements/page.tsx");

  expect(adminFetch).toContain("const READ_TIMEOUT_MS = 30_000");
  expect(statsRoute).toContain("unstable_cache");
  expect(statsRoute).toContain("revalidate: 15");
  expect(measurementsPage).toContain("const refreshStats = () =>");
  expect(measurementsPage).toContain("instead of creating an unhandled browser rejection");
});

test("shared dialogs either provide a description or explicitly opt out", () => {
  const dialog = source("components/ui/dialog.tsx");
  expect(dialog).toContain("function hasDialogDescription");
  expect(dialog).toContain("const contentProps = hasDialogDescription(children)");
  expect(dialog).toContain("'aria-describedby': undefined");
});

test("high-volume storefront links do not preload unused route styles", () => {
  const productCard = source("components/product/product-card.tsx");
  const mobileHome = source("components/home/mobile-department-home.tsx");
  const headerMenu = source("components/layout/catalog-header-menu.tsx");

  expect(productCard.match(/prefetch=\{false\}/g)).toHaveLength(2);
  expect(mobileHome.match(/prefetch=\{false\}/g)?.length).toBeGreaterThanOrEqual(4);
  expect(headerMenu.match(/prefetch=\{false\}/g)?.length).toBeGreaterThanOrEqual(4);
});

test("persistent navigation does not prefetch unused route CSS", () => {
  const noPrefetchLink = source("components/navigation/no-prefetch-link.tsx");
  const navigationFiles = [
    "components/layout/header.tsx",
    "components/layout/footer.tsx",
    "components/layout/catalog-header-menu.tsx",
    "components/layout/catalog-mobile-department-menu.tsx",
    "components/layout/catalog-mobile-menu.tsx",
    "components/layout/catalog-mobile-nav.tsx",
    "components/cart/cart-drawer.tsx",
  ];

  expect(noPrefetchLink).toContain("prefetch = false");
  for (const file of navigationFiles) {
    expect(source(file)).toContain(
      'from "@/components/navigation/no-prefetch-link"',
    );
  }
});

test("guest auth sync and mobile navigation stay console-clean", () => {
  const authSync = source("components/auth-sync.tsx");
  const mobileNav = source("components/layout/catalog-mobile-nav.tsx");

  expect(authSync).toContain('fetch("/api/auth/session"');
  expect(authSync.indexOf('fetch("/api/auth/session"')).toBeLessThan(
    authSync.indexOf('fetch("/api/user/profile"')
  );
  expect(authSync).toContain("if (!session?.user?.id || !session.user.role)");
  expect(mobileNav).toContain("inert={!isOpen}");
  expect(mobileNav).not.toContain('inert={!isOpen ? "" : undefined}');
});

test("responsive artwork avoids deprecated preload APIs and One Tap is not auto-mounted", () => {
  const mobileHome = source("components/home/mobile-department-home.tsx");
  const widgets = source("app/client-widgets.tsx");
  const login = source("app/login/login-client.tsx");

  expect(mobileHome).toContain("fetchPriority={priority ? 'high' : undefined}");
  expect(mobileHome).not.toContain("priority={priority}");
  expect(widgets).not.toContain("GoogleOneTap");
  expect(login).not.toContain("GoogleOneTap");
});
