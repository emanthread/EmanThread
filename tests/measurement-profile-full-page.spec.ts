import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import { femaleMeasurementForms } from "../app/measurements/female/femaleMeasurements";
import { maleMeasurementForms } from "../app/measurements/male/maleMeasurements";
import {
  GARMENT_TYPES_BY_GENDER,
  UNIFIED_MEASUREMENT_EMPTY,
  garmentTypeLabel,
  mapFromPrismaFields,
  mapToPrismaFields,
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
  expect(printCard).toContain("font-size: 20px !important");
  expect(printCard).toContain("font-size: 16px !important");
  expect(printCard).toContain("font-size: 15.5px !important");
  expect(printCard).toContain("font-weight: 800 !important");
  expect(printCard).toContain("font-weight: 700 !important");
  expect(printCard).toContain(".tailor-print-portal .a4-entry");
  expect(layout).toContain("--soft: #fff");
  expect(layout).not.toContain("linear-gradient(180deg, #fff, #f8fafc)");
});

test("A4 print output enlarges uniformly within the fixed paper without changing the form grid", () => {
  const printCard = source("components/admin/tailor-print-card.tsx");
  const form = source("components/measurements/forms/A4MeasurementForm.tsx");
  const layout = source("components/measurements/forms/a4-layout.css");

  expect(printCard).toContain("const FIXED_PRINT_PAGE_WIDTH_MM = 253.3");
  expect(printCard).toContain("const FIXED_PRINT_PAGE_HEIGHT_MM = 352.8");
  expect(printCard).toContain("const A4_PRINT_SCALE = 1.15");
  expect(printCard).toContain('function ensurePrintStyleInHead(format: "a4" | "a6")');
  expect(printCard).toContain("ensurePrintStyleInHead(format)");
  expect(printCard).toContain("top: ${A4_PRINT_TOP_MM}mm !important");
  expect(printCard).toContain("left: ${A4_PRINT_LEFT_MM}mm !important");
  expect(printCard).toContain("transform: scale(${A4_PRINT_SCALE}) !important");
  expect(printCard).toContain("transform-origin: top left !important");
  expect(printCard).toContain("padding: 4mm !important");
  expect(printCard).toContain("font-size: 18px !important");
  expect(printCard).toContain("font-size: 14px !important");
  expect(printCard).toContain("-webkit-text-fill-color: var(--ink) !important");
  expect(layout).toContain("font-size: 18px");
  expect(layout).toContain("font-size: 14px");
  expect(form).toContain('background: bottomType === tab ? "#dbeafe" : "#fff"');
  expect(form).toContain('color: "var(--ink)"');

  const safetyMarginMm = 5;
  expect(210 * 1.15 + safetyMarginMm * 2).toBeLessThanOrEqual(253.3);
  expect(297 * 1.15 + safetyMarginMm * 2).toBeLessThanOrEqual(352.8);
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

test("Shalwar uses one pocket dropdown and preserves legacy Front and Side values", () => {
  const form = source("components/measurements/forms/A4MeasurementForm.tsx");
  const layout = source("components/measurements/forms/A4PageLayout.tsx");
  const validator = source("lib/validators/measurements-unified.ts");
  const shalwarStart = form.indexOf("variant === 'mens' && bottomType === \"shalwar\"");
  const shalwarEnd = form.indexOf("Shared Trouser Panel", shalwarStart);
  const shalwarPanel = form.slice(shalwarStart, shalwarEnd);

  expect(shalwarStart).toBeGreaterThan(-1);
  expect(shalwarEnd).toBeGreaterThan(shalwarStart);
  expect(shalwarPanel.match(/<A4PocketDropdown/g)).toHaveLength(1);
  expect(shalwarPanel).not.toContain('label="Front"');
  expect(shalwarPanel).not.toContain('label="Side"');
  expect(shalwarPanel).toContain('setField("shalwarPocket", value)');
  expect(layout).toContain('label ? `${label} pocket count` : "Pocket count"');
  expect(layout).toContain('<option value="1">1</option>');
  expect(layout).toContain('<option value="2">2</option>');
  expect(layout).toContain('disabled={readOnly}');
  expect(validator).toContain('const toggle = z.string().default("0")');

  const parsed = unifiedMeasurementSchema.parse({
    ...UNIFIED_MEASUREMENT_EMPTY,
    frontPocket: "2",
    sidePocket: "1",
    shalwarPocket: "1",
    shalwarAssan1: "13",
    trouserAssan1: "14",
  });
  const stored = mapToPrismaFields(parsed);
  expect(stored.frontPocket).toBe("2");
  expect(stored.sidePocket).toBe("1");
  expect(stored.shalwarPocket).toBe("1");
  expect(stored.shalwarAssan1).toBe("13");
  expect(stored.trouserdata12).toBe("14");

  const restored = mapFromPrismaFields(stored);
  expect(restored.frontPocket).toBe("2");
  expect(restored.sidePocket).toBe("1");
  expect(restored.shalwarPocket).toBe("1");
  expect(restored.shalwarAssan1).toBe("13");
  expect(restored.trouserAssan1).toBe("14");
});

test("Assan follows Gherra in Shalwar and Tigh in every Trouser or Pent layout", () => {
  const form = source("components/measurements/forms/A4MeasurementForm.tsx");
  expect(form).toContain('<A4Row label="3. Gherra"');
  expect(form).toContain('<A4Row label="4. Assan"><A4Input value={String(data.shalwarAssan1');
  expect(form).toContain('<A4Row label="3. Tigh"');
  expect(form).toContain('<A4Row label="4. Assan"><A4Input value={String(data.trouserAssan1');
  expect(form.match(/key: "trouserAssan1"/g)).toHaveLength(3);

  const labels = (fields: Array<{ label: string }>) => fields.map(({ label }) => label.replace(/^\d+\.\s*/, ""));
  const assertAssanAfterTigh = (fields: Array<{ label: string }>) => {
    const fieldLabels = labels(fields);
    const tighIndex = fieldLabels.indexOf("Tigh");
    expect(tighIndex).toBeGreaterThan(-1);
    expect(fieldLabels[tighIndex + 1]).toBe("Assan");
  };

  const maleShalwar = maleMeasurementForms.find(({ id }) => id === "shalwar-kameez")!;
  assertAssanAfterTigh(maleShalwar.sections[0].bottomType!.find(({ label }) => label === "Trouser")!.fields);
  assertAssanAfterTigh(maleMeasurementForms.find(({ id }) => id === "simple-3-piece-suit")!.sections.find(({ title }) => title === "Pent")!.fields);
  assertAssanAfterTigh(maleMeasurementForms.find(({ id }) => id === "prince-coat-3-piece-suit")!.sections.find(({ title }) => title === "Pent")!.fields);

  const femaleFrock = femaleMeasurementForms.find(({ id }) => id === "ladies-frock")!;
  assertAssanAfterTigh(femaleFrock.sections.find(({ title }) => title === "Trouser")!.fields);
  const femaleShalwar = femaleMeasurementForms.find(({ id }) => id === "ladies-shalwar-kameez")!;
  assertAssanAfterTigh(femaleShalwar.sections[0].bottomType!.find(({ label }) => label === "Trouser")!.fields);
  assertAssanAfterTigh(femaleMeasurementForms.find(({ id }) => id === "female-pent-coat")!.sections.find(({ title }) => title === "Pent")!.fields);
});
test("Male Waistcoat is the fifth full-width male form with only its requested fields", () => {
  expect(GARMENT_TYPES_BY_GENDER.Male).toEqual([
    "male_shalwar_kameez",
    "male_simple_3_piece",
    "male_prince_coat",
    "male_shirt",
    "male_waistcoat",
  ]);
  expect(garmentTypeLabel("male_waistcoat")).toBe("Male Waistcoat");

  const parsed = unifiedMeasurementSchema.parse({
    ...UNIFIED_MEASUREMENT_EMPTY,
    garmentType: "male_waistcoat",
    neck1: "15",
    bane1: "2.5",
    baneCb: "1",
    roundneck: "1",
  });
  expect(parsed.neck1).toBe("15");
  expect(parsed.bane1).toBe("2.5");
  expect(parsed.baneCb).toBe("1");
  expect(parsed.roundneck).toBe("1");

  const form = source("components/measurements/forms/A4MeasurementForm.tsx");
  const start = form.indexOf("  male_waistcoat: {");
  const end = form.indexOf("\n  female_frock:", start);
  const waistcoat = form.slice(start, end);

  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  expect(waistcoat).toContain('title: "Waistcoat"');
  expect(waistcoat).toContain('key: "neck1"');
  expect(waistcoat).toContain('{ label: "Bane", key: "baneCb" }');
  expect(waistcoat).toContain('{ label: "V-neck", key: "roundneck" }');
  expect(waistcoat).toContain('stackToggles: true');
  expect(waistcoat).not.toContain('subInputs: [{ label: "Bane"');
  const orderedLabels = ["Length", "Shoulder", "Neck", "Chest", "Waist"];
  let previousIndex = -1;
  for (const label of orderedLabels) {
    const nextIndex = waistcoat.indexOf(`label: "${label}"`, previousIndex + 1);
    expect(nextIndex).toBeGreaterThan(previousIndex);
    previousIndex = nextIndex;
  }
  expect(waistcoat).not.toContain('label: "Sleeves"');
  expect(waistcoat).not.toContain('label: "Hip"');
  expect(waistcoat).not.toContain('label: "Pocket"');
  expect(waistcoat).not.toContain("rightSections");

  const printable = maleMeasurementForms.at(-1);
  expect(printable?.label).toBe("Male Waistcoat");
  expect(printable?.layout).toBe("full");
  expect(printable?.sections).toHaveLength(1);
  expect(printable?.sections[0].fields.map(({ label }) => label)).toEqual([
    "Length",
    "Shoulder",
    "Neck",
    "Chest",
    "Waist",
  ]);
  expect(printable?.sections[0].fields[2]).toMatchObject({
    label: "Neck",
    type: "checkbox-row",
    checkboxes: [{ label: "Bane" }, { label: "V-neck" }],
    stackCheckboxes: true,
  });
  expect(printable?.sections[0].bottomType).toBeUndefined();
  expect(printable?.sections.some(({ isSide }) => isSide)).toBe(false);
});

test("Female Pent Coat reuses the Male 3 Piece Suit layout with shoulder options", () => {
  expect(garmentTypeLabel("male_simple_3_piece")).toBe("Male 3 Piece Suit");
  expect(GARMENT_TYPES_BY_GENDER.Female).toContain("female_pent_coat");
  expect(garmentTypeLabel("female_pent_coat")).toBe("Female Pent Coat");

  const parsed = unifiedMeasurementSchema.parse({
    ...UNIFIED_MEASUREMENT_EMPTY,
    gender: "Female",
    garmentType: "female_pent_coat",
    length1: "40",
    straightCb: "1",
    downCb: "1",
    trouserWaist1: "30",
  });
  expect(parsed.garmentType).toBe("female_pent_coat");
  expect(parsed.length1).toBe("40");
  expect(parsed.straightCb).toBe("1");
  expect(parsed.downCb).toBe("1");
  expect(parsed.trouserWaist1).toBe("30");

  const form = source("components/measurements/forms/A4MeasurementForm.tsx");
  expect(form).toContain("CONFIGS.female_pent_coat = {");
  expect(form).toContain("...CONFIGS.male_simple_3_piece");
  expect(form).toContain('title: "Female Pent Coat"');
  expect(form).toContain('{ label: "Straight", key: "straightCb" }');
  expect(form).toContain('{ label: "Down", key: "downCb" }');

  const male = maleMeasurementForms.find(({ id }) => id === "simple-3-piece-suit");
  const female = femaleMeasurementForms.find(({ id }) => id === "female-pent-coat");
  expect(male?.label).toBe("Male 3 Piece Suit");
  const shape = (sections: Array<{
    title: string;
    isSide?: boolean;
    fields: Array<{
      label: string;
      type: string;
      subItems?: Array<{ label: string; isCheckbox?: boolean }>;
      checkboxes?: Array<{ label: string }>;
    }>;
  }>) => sections.map((section) => ({
      title: section.title,
      isSide: section.isSide,
      fields: section.fields.map((field) => ({
        label: field.label,
        type: field.type,
        subItems: field.subItems,
        checkboxes: field.checkboxes,
      })),
    }));

  expect(female?.layout).toBe("split");
  const femaleShoulder = female!.sections[0].fields.find(
    ({ label }) => label === "Shoulder"
  );
  expect(femaleShoulder).toMatchObject({
    type: "checkbox-row",
    checkboxes: [{ label: "Straight" }, { label: "Down" }],
  });
  const shapeWithoutShoulder = (sections: Parameters<typeof shape>[0]) =>
    shape(sections).map((section) => ({
      ...section,
      fields: section.fields.filter(({ label }) => label !== "Shoulder"),
    }));
  expect(shapeWithoutShoulder(female!.sections)).toEqual(
    shapeWithoutShoulder(male!.sections)
  );
});
