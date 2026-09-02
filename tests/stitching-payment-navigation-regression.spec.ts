import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("catalog paths are server seeded and refreshed without a hydration waterfall", () => {
  const rootLayout = source("app/layout.tsx");
  const header = source("components/layout/header.tsx");
  const provider = source("components/layout/published-catalog-provider.tsx");
  const catalogDb = source("lib/db/catalog.ts");
  const nodeRoutes = [
    source("app/api/admin/catalog/nodes/route.ts"),
    source("app/api/admin/catalog/nodes/[id]/route.ts"),
  ].join("\n");

  expect(rootLayout).toContain("getCachedPublishedCatalogSidebarNavigation");
  expect(rootLayout).toContain("PublishedCatalogProvider");
  expect(header).toContain("useInitialPublishedCatalogPaths");
  expect(header).not.toContain("_t=${Date.now()}");
  expect(provider).toContain("PublishedCatalogPathsContext.Provider");
  expect(catalogDb).toContain('tags: ["catalog-navigation"]');
  expect(nodeRoutes).toContain('revalidateTag("catalog-navigation", { expire: 0 })');
});

test("manual payment locking is Prisma-safe and submission errors remain actionable", () => {
  const payments = source("lib/db/payments.ts");
  const route = source("app/api/payments/manual/submit/route.ts");
  const page = source("app/payment-confirmation/page.tsx");

  expect(payments).toContain('SELECT TRUE AS "locked"');
  expect(payments).toContain("FROM pg_advisory_xact_lock");
  expect(payments).not.toMatch(/SELECT\s+pg_advisory_xact_lock/);
  expect(payments).toContain("Payment proof has already been submitted for this order");
  expect(route).toContain("sanitizeDbError");
  expect(page).toContain('apiFetch("/api/payments/manual/submit"');
  expect(page).toContain('role="alert"');
  expect(page).not.toContain('alert("Failed to submit payment")');
});
