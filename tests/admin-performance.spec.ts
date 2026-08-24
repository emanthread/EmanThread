import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("admin consumers subscribe only to the store slices they render", () => {
  const files = [
    "app/admin/(dashboard)/layout.tsx",
    "app/admin/(dashboard)/page.tsx",
    "app/admin/(dashboard)/orders/page.tsx",
    "app/admin/(dashboard)/orders/[id]/page.tsx",
    "app/admin/(dashboard)/returns/page.tsx",
    "app/admin/(dashboard)/discounts/page.tsx",
    "components/admin/product-list-page.tsx",
  ];

  for (const file of files) {
    const contents = source(file);
    expect(contents, file).not.toMatch(/useAdminStore\(\s*\)/);
    if (file === "app/admin/(dashboard)/orders/[id]/page.tsx") {
      expect(contents, file).not.toContain("useAdminStore");
      expect(contents, file).toContain("/api/admin/orders/");
    } else {
      expect(contents, file).toContain("useShallow");
    }
  }
});

test("admin polling is stable and pauses nonessential hidden-tab work", () => {
  const dismissals = source("hooks/use-alert-dismissals.ts");
  const dashboard = source("app/admin/(dashboard)/page.tsx");
  const pushNotifications = source("hooks/use-admin-push-notifications.ts");

  expect(dismissals).toContain("useCallback");
  expect(dismissals).toContain("}, []);");
  expect(dashboard).toContain("requestIdleCallback");
  expect(dashboard).toContain('document.visibilityState === "visible"');
  expect(pushNotifications).toContain('document.visibilityState !== "visible"');
});

test("admin runtime avoids duplicate auth and database-pool pressure", () => {
  const db = source("lib/db.ts");
  const logger = source("lib/logger.ts");
  const alertsRoute = source("app/api/admin/alerts/route.ts");
  const adminFetch = source("lib/admin-fetch.ts");

  expect(db).toContain("globalForPrisma.prisma = prisma");
  expect(logger).not.toContain('import { auth } from "@/auth"');
  expect(alertsRoute).toContain("unstable_cache");
  expect(adminFetch).toContain("RETRYABLE_GATEWAY_STATUSES");
});

test("customer-only widgets and analytics stay out of admin routes", () => {
  const widgets = source("app/client-widgets.tsx");
  const tracking = source("components/storefront-tracking.tsx");

  expect(widgets).toContain("isAdminRoute");
  expect(widgets).toContain("if (isAdminRoute) return");
  expect(tracking).toContain('pathname.startsWith("/admin")');
});

test("media library uses its lean private endpoint", () => {
  const page = source("app/admin/(dashboard)/media-library/page.tsx");
  const route = source("app/api/admin/media/route.ts");

  expect(page).toContain('fetch("/api/admin/media"');
  expect(page).toContain("useMemo");
  expect(route).toContain("select: {");
  expect(route).toContain('"Cache-Control": "private, no-store"');
  expect(route).not.toContain("getAdminProducts");
});

test("admin fill images declare responsive sizes", () => {
  const files = [
    "app/admin/(dashboard)/layout.tsx",
    "app/admin/(dashboard)/page.tsx",
    "app/admin/(dashboard)/orders/page.tsx",
    "app/admin/(dashboard)/orders/[id]/page.tsx",
    "app/admin/(dashboard)/reviews/page.tsx",
    "app/admin/(dashboard)/hero-slides/page.tsx",
    "app/admin/(dashboard)/featured-categories/page.tsx",
    "app/admin/login/page.tsx",
    "components/admin/product-editor.tsx",
  ];

  for (const file of files) {
    const contents = source(file);
    const imageBlocks = contents.match(/<Image\b[\s\S]*?\/>/g) || [];
    for (const block of imageBlocks) {
      if (block.includes(" fill") || block.includes("\n                  fill")) {
        expect(block, file).toContain("sizes=");
      }
    }
  }
});
