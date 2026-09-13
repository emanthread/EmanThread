import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import {
  UNIFIED_MEASUREMENT_EMPTY,
  unifiedMeasurementSchema,
} from "../lib/validators/measurements-unified";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("new measurement profiles use a dedicated page and preserve return flow", () => {
  const manager = source("components/measurements/MeasurementProfileManager.tsx");
  const createPage = source("app/account/measurements/new/page.tsx");
  const productPage = source("app/product/[id]/product-page-client.tsx");
  const checkout = source("app/checkout/page.tsx");

  expect(manager).toContain('router.push("/account/measurements/new")');
  expect(manager).not.toContain("{/* Create Dialog */}");
  expect(createPage).toContain("Create Measurement Profile");
  expect(createPage).toContain('fetch("/api/measurements"');
  expect(createPage).toContain("safeInternalReturnPath");
  expect(createPage).toContain("withQueryValue");
  expect(productPage).toContain("/account/measurements/new?returnTo=");
  expect(checkout).toContain("/account/measurements/new?returnTo=");
});

test("A6 print output stays fixed-size while improving contrast and white backgrounds", () => {
  const printCard = source("components/admin/tailor-print-card.tsx");
  const layout = source("components/measurements/forms/a4-layout.css");

  expect(printCard).toContain("@page { size: 105mm 148mm; margin: 0; }");
  expect(printCard).toContain("transform: scale(0.5) !important");
  expect(printCard).toContain("width: 105mm !important");
  expect(printCard).toContain("height: 148.5mm !important");
  expect(printCard).toContain("A6 readability only");
  expect(printCard).toContain("font-family: Arial, Helvetica, sans-serif !important");
  expect(printCard).toContain("--ink: #000 !important");
  expect(printCard).toContain(".tailor-print-portal .a4-entry");
  expect(layout).toContain("--soft: #fff");
  expect(layout).not.toContain("linear-gradient(180deg, #fff, #f8fafc)");
});

test("stitching slips use the order delivery date without creation-date fallbacks", () => {
  const printCard = source("components/admin/tailor-print-card.tsx");
  const customerOrders = source("app/account/orders/page.tsx");
  const adminOrder = source("app/admin/(dashboard)/orders/[id]/page.tsx");
  const ordersDb = source("lib/db/orders.ts");

  expect(printCard).toContain("formatTailorDeliveryDate");
  expect(printCard).toContain("formatPKTDate(parsed)");
  expect(customerOrders).toContain('deliveryDate: order.stitchingDeliveryDate || ""');
  expect(adminOrder).toContain('deliveryDate: order.stitchingDeliveryDate || ""');
  expect(adminOrder).not.toContain("deliveryDate: new Date(order.createdAt)");
  expect(ordersDb).toContain("stitchingDeliveryDate: order.stitchingDeliveryDate?.toISOString() ?? null");
});

test("pocket controls use a one-or-two count dropdown without schema changes", () => {
  const form = source("components/measurements/forms/A4MeasurementForm.tsx");
  const layout = source("components/measurements/forms/A4PageLayout.tsx");
  const validator = source("lib/validators/measurements-unified.ts");

  expect(form).toContain('section.toggles.map((toggle)');
  expect(form).toContain('label="Front"');
  expect(form).toContain('label="Side"');
  expect(form).toContain('setField("frontPocket", value)');
  expect(form).toContain('setField("sidePocket", value)');
  expect(form).toContain('setField("shalwarPocket", v)');
  expect(layout).toContain('label ? `${label} pocket count` : "Pocket count"');
  expect(layout).toContain('height: "9mm"');
  expect(layout).toContain('width: label ? "13mm" : undefined');
  expect(layout).toContain('<option value="1">1</option>');
  expect(layout).toContain('<option value="2">2</option>');
  expect(layout).toContain('disabled={readOnly}');
  expect(validator).toContain('const toggle = z.string().default("0")');

  const parsed = unifiedMeasurementSchema.parse({
    ...UNIFIED_MEASUREMENT_EMPTY,
    frontPocket: "2",
    sidePocket: "1",
    shalwarPocket: "1",
  });
  expect(parsed.frontPocket).toBe("2");
  expect(parsed.sidePocket).toBe("1");
  expect(parsed.shalwarPocket).toBe("1");
});
