import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import {
  composeMeasurementValue,
  normalizePocketQuantity,
  sanitizePocketQuantityInput,
  splitMeasurementValue,
} from "../lib/measurement-values";
import { unifiedMeasurementSchema } from "../lib/validators/measurements-unified";

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

test("measurement values combine whole numbers with selectable fractions", () => {
  expect(splitMeasurementValue("42 1/2")).toEqual({
    whole: "42",
    fraction: "1/2",
  });
  expect(splitMeasurementValue("1/4")).toEqual({
    whole: "",
    fraction: "1/4",
  });
  expect(composeMeasurementValue(" 42 ", "1/4")).toBe("42 1/4");
  expect(composeMeasurementValue("42", "")).toBe("42");
});

test("Shalwar Kameez pockets accept non-negative numeric quantities", () => {
  const form = source("components/measurements/forms/A4MeasurementForm.tsx");
  const layout = source("components/measurements/forms/A4PageLayout.tsx");

  expect(normalizePocketQuantity("")).toBe("0");
  expect(normalizePocketQuantity("1")).toBe("1");
  expect(normalizePocketQuantity("2")).toBe("2");
  expect(normalizePocketQuantity("5")).toBe("5");
  expect(normalizePocketQuantity("true")).toBe("1");
  expect(sanitizePocketQuantityInput("04")).toBe("4");
  expect(sanitizePocketQuantityInput("-1")).toBeNull();
  expect(sanitizePocketQuantityInput("1.5")).toBeNull();
  const parsed = unifiedMeasurementSchema.parse({
    profileName: "Pocket quantity regression",
    frontPocket: "5",
    sidePocket: "4",
    shalwarPocket: "3",
  });
  expect(parsed.frontPocket).toBe("5");
  expect(parsed.sidePocket).toBe("4");
  expect(parsed.shalwarPocket).toBe("3");
  expect(form).toContain('quantities: [');
  expect(form).toContain('{ label: "Front", key: "frontPocket" }');
  expect(form).toContain('{ label: "Side", key: "sidePocket" }');
  expect(form).toContain('label="Shalwar"');
  expect(form).toContain('label="Trouser"');
  expect(layout).toContain('type="number"');
  expect(layout).toContain("MAX_POCKET_QUANTITY");
  expect(form).not.toContain('<A4Pill label="Front"');
  expect(form).not.toContain('<A4Pill label="Side"');
  expect(form).not.toContain('<A4Pill label="Pocket"');
});

test("measurement editing adapts to narrow containers without affecting print", () => {
  const layout = source("components/measurements/forms/a4-layout.css");

  expect(layout).toContain("container-name: measurement-preview");
  expect(layout).toContain("@media screen");
  expect(layout).toContain("@container measurement-preview (max-width: 700px)");
  expect(layout).toContain("repeat(auto-fit, minmax(105px, 1fr))");
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

test("order stitching slips use the authoritative stored stitching delivery date", () => {
  const orderDb = source("lib/db/orders.ts");
  const adminOrder = source("app/admin/(dashboard)/orders/[id]/page.tsx");
  const customerOrders = source("app/account/orders/page.tsx");
  const measurementPages = [
    source("app/admin/(dashboard)/customer-measurements/page.tsx"),
    source("app/admin/(dashboard)/measurements/page.tsx"),
    source("app/admin/(dashboard)/measurements/profile/[id]/page.tsx"),
  ].join("\n");

  expect(orderDb).toContain("stitchingDeliveryDate");
  expect(adminOrder).toContain('deliveryDate: order.stitchingDeliveryDate || ""');
  expect(customerOrders).toContain(
    'deliveryDate: order.stitchingDeliveryDate || ""'
  );
  expect(measurementPages).not.toMatch(/deliveryDate:.*(?:createdAt|updatedAt)/);
});
