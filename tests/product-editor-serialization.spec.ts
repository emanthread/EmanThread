import { expect, test } from "@playwright/test";
import {
  catalogNodePickerResults,
  serializeCatalogAssignments,
  type CatalogNode,
} from "../components/admin/product-catalog-assignment-section";
import {
  emptyCommerceProfileDraft,
  serializeCommerceProfile,
} from "../components/admin/product-commerce-profile-section";

test.describe("product editor draft validation", () => {
  test("starts with the canonical unstitched option name", () => {
    expect(emptyCommerceProfileDraft().optionLabel).toBe("Option");
  });

  test("rejects duplicate catalog placements", () => {
    expect(() =>
      serializeCatalogAssignments([
        { catalogNodeId: "node-1", isFeatured: false, displayOrder: "" },
        { catalogNodeId: "node-1", isFeatured: true, displayOrder: "2" },
      ])
    ).toThrow("Each catalog node can be assigned only once");
  });

  test("requires an option name when options exist", () => {
    expect(() =>
      serializeCommerceProfile({
        ...emptyCommerceProfileDraft(),
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
