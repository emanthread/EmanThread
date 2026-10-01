import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import {
  catalogNodePickerResults,
  hydrateCatalogAssignmentDrafts,
  isSecondaryCatalogDestination,
  serializeCatalogAssignments,
  type CatalogNode,
} from "../components/admin/product-catalog-assignment-section";
import {
  emptyCommerceProfileDraft,
  serializeCommerceProfile,
} from "../components/admin/product-commerce-profile-section";
import { classifyCatalogNode } from "../lib/catalog-product-classification";
import {
  colorPickerValue,
  isValidHexColor,
  normalizeHexColorInput,
} from "../lib/color-hex";

test.describe("product editor draft validation", () => {
  test("normalizes exact product hex input without accepting arbitrary colors", () => {
    expect(normalizeHexColorInput("0088cc")).toBe("#0088CC");
    expect(normalizeHexColorInput("#ff0000")).toBe("#FF0000");
    expect(normalizeHexColorInput("#12")).toBe("#12");
    expect(normalizeHexColorInput("red")).toBe("red");

    expect(isValidHexColor("#0088CC")).toBe(true);
    expect(isValidHexColor("#fff")).toBe(false);
    expect(isValidHexColor("red")).toBe(false);
    expect(colorPickerValue("#0088CC")).toBe("#0088CC");
    expect(colorPickerValue("invalid")).toBe("#000000");
  });

  test("connects the manual hex field and native picker to the same editor value", () => {
    const editor = readFileSync(
      resolve(process.cwd(), "components/admin/product-editor.tsx"),
      "utf8"
    );

    expect(editor).toContain('<Label htmlFor="colorHex">Hex code</Label>');
    expect(editor).toContain('id="colorHexPicker"');
    expect(editor).toContain(
      "onChange={(event) => updateColorHex(event.target.value)}"
    );
    expect(editor).toContain("value={colorPickerValue(product.colorHex)}");
  });

  test("starts with the canonical unstitched option name", () => {
    expect(emptyCommerceProfileDraft().optionLabel).toBe("Option");
  });

  test("serializes every selected category without discarding placement settings", () => {
    expect(serializeCatalogAssignments([
      { catalogNodeId: "node-1", isFeatured: true, displayOrder: "12" },
      { catalogNodeId: "node-2", isFeatured: false, displayOrder: "" },
    ])).toEqual([
      { catalogNodeId: "node-1", isFeatured: true, displayOrder: 12 },
      { catalogNodeId: "node-2", isFeatured: false, displayOrder: null },
    ]);
  });

  test("restores every saved category with the primary assignment first", () => {
    const primaryNode = {
      label: "Kurtas",
      path: "/women/ready-to-wear/kurtas",
      productKind: "READY_TO_WEAR" as const,
      isActive: true,
      isVisible: true,
    };
    const saleNode = {
      label: "SALE",
      path: "/women/sale",
      productKind: null,
      isActive: true,
      isVisible: true,
    };

    expect(hydrateCatalogAssignmentDrafts([], [
      {
        catalogNodeId: "sale",
        isPrimary: false,
        isFeatured: true,
        displayOrder: 7,
        catalogNode: saleNode,
      },
      {
        catalogNodeId: "kurtas",
        isPrimary: true,
        isFeatured: true,
        displayOrder: 3,
        catalogNode: primaryNode,
      },
    ])).toEqual([
      {
        catalogNodeId: "kurtas",
        isFeatured: true,
        displayOrder: "3",
        catalogNode: primaryNode,
      },
      {
        catalogNodeId: "sale",
        isFeatured: true,
        displayOrder: "7",
        catalogNode: saleNode,
      },
    ]);
  });

  test("keeps every unsaved category draft during a retry", () => {
    const drafts = [
      { catalogNodeId: "primary", isFeatured: false, displayOrder: "" },
      { catalogNodeId: "secondary", isFeatured: false, displayOrder: "" },
    ];

    expect(hydrateCatalogAssignmentDrafts(drafts, [])).toEqual(drafts);
  });

  test("allows Sale as a secondary destination but not a primary classification", () => {
    const saleNode: CatalogNode = {
      id: "sale",
      label: "SALE",
      path: "/women/sale",
      productKind: null,
      isActive: true,
      isVisible: true,
      _count: { children: 0 },
    };
    const departmentNode: CatalogNode = {
      id: "women",
      label: "WOMEN",
      path: "/women",
      productKind: null,
      isActive: true,
      isVisible: true,
      _count: { children: 5 },
    };
    const unrelatedLandingNode: CatalogNode = {
      ...saleNode,
      id: "editorial",
      label: "Editorial",
      path: "/women/editorial",
    };
    const inactiveSaleNode: CatalogNode = {
      ...saleNode,
      id: "inactive-sale",
      isActive: false,
    };

    expect(classifyCatalogNode(saleNode)).toBeNull();
    expect(isSecondaryCatalogDestination(saleNode)).toBe(true);
    expect(isSecondaryCatalogDestination(departmentNode)).toBe(false);
    expect(isSecondaryCatalogDestination(unrelatedLandingNode)).toBe(false);
    expect(isSecondaryCatalogDestination(inactiveSaleNode)).toBe(false);
  });

  test("requires an option name when options exist", () => {
    expect(() =>
      serializeCommerceProfile({
        ...emptyCommerceProfileDraft(),
        productKind: "FRAGRANCE",
        optionLabel: "",
        variants: [
          {
            optionKey: "50-ml",
            label: "50 ml",
            sku: "",
            priceAdjustment: "0",
            stockQuantity: "5",
            inStock: true,
            isActive: true,
            colorHex: "#000000",
            images: ["/placeholder.jpg"],
          },
        ],
      })
    ).toThrow("Enter a name for the product options");
  });

  test("rejects partial detail rows and unsafe size-guide URLs", () => {
    expect(() =>
      serializeCommerceProfile({
        ...emptyCommerceProfileDraft(),
        details: [{ label: "Material", value: "" }],
      })
    ).toThrow("Detail 1 needs both a label and a value");

    expect(() =>
      serializeCommerceProfile({
        ...emptyCommerceProfileDraft(),
        sizeGuideUrl: "javascript:alert(1)",
      })
    ).toThrow("Size guide URL must begin with /, http://, or https://");
  });

  test("keeps a catalog with hundreds of nodes searchable and DOM-bounded", () => {
    const nodes: CatalogNode[] = Array.from({ length: 500 }, (_, index) => ({
      id: `node-${index}`,
      label: `Category ${index}`,
      path: `/women/ready-to-wear/category-${index}`,
      productKind: "READY_TO_WEAR",
      isActive: true,
      isVisible: true,
      _count: { children: 0 },
    }));

    expect(catalogNodePickerResults(nodes, nodes, "")).toMatchObject({
      total: 500,
      nodes: expect.arrayContaining([
        expect.objectContaining({ id: "node-0" }),
      ]),
    });
    expect(catalogNodePickerResults(nodes, nodes, "").nodes).toHaveLength(75);
    expect(catalogNodePickerResults(nodes, nodes, "category 499")).toEqual({
      total: 1,
      nodes: [nodes[499]],
    });
  });

  test("enforces required options from the product schema", () => {
    expect(() =>
      serializeCommerceProfile({
        ...emptyCommerceProfileDraft(),
        productKind: "READY_TO_WEAR",
        stitchingEligible: true,
        requiresSelection: false,
        optionLabel: "Size",
        variants: [],
      })
    ).toThrow("Add at least one size before saving this product");
  });
});
