import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import {
  catalogVisibilityToggleBlockReason,
  type CatalogVisibilityNode,
} from "../lib/catalog-visibility";

function catalogNode(
  overrides: Partial<CatalogVisibilityNode> & Pick<CatalogVisibilityNode, "id" | "label">
): CatalogVisibilityNode {
  return {
    parentId: null,
    isActive: true,
    isVisible: true,
    ...overrides,
  };
}

test.describe("catalog visibility quick toggle", () => {
  test("allows a published leaf path to be hidden", () => {
    const leaf = catalogNode({ id: "kurta", label: "Kurta" });

    expect(catalogVisibilityToggleBlockReason(leaf, [leaf], false)).toBeNull();
  });

  test("requires visible children to be hidden before their parent", () => {
    const parent = catalogNode({ id: "women", label: "Women" });
    const child = catalogNode({
      id: "ready-to-wear",
      label: "Ready to Wear",
      parentId: parent.id,
    });

    expect(
      catalogVisibilityToggleBlockReason(parent, [parent, child], false)
    ).toBe("Hide 1 visible child path first");
  });

  test("allows a hidden active root path to be published", () => {
    const root = catalogNode({
      id: "teens",
      label: "Teens",
      isVisible: false,
    });

    expect(catalogVisibilityToggleBlockReason(root, [root], true)).toBeNull();
  });

  test("requires the full parent chain to be published first", () => {
    const parent = catalogNode({
      id: "teens",
      label: "Teens",
      isVisible: false,
    });
    const child = catalogNode({
      id: "teen-girls",
      label: "Teen Girls",
      parentId: parent.id,
      isVisible: false,
    });

    expect(
      catalogVisibilityToggleBlockReason(child, [parent, child], true)
    ).toBe("Publish parent Teens first");
  });

  test("keeps inactive and visible as separate states", () => {
    const inactive = catalogNode({
      id: "partywear",
      label: "Partywear",
      isActive: false,
      isVisible: false,
    });

    expect(
      catalogVisibilityToggleBlockReason(inactive, [inactive], true)
    ).toBe("Activate this path before publishing it");
  });

  test("sends a focused visibility patch and confirms only hiding", () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        "app/admin/(dashboard)/catalog/catalog-assignment-client.tsx"
      ),
      "utf8"
    );

    expect(source).toContain("body: JSON.stringify({ isVisible: nextVisible })");
    expect(source).toContain("!nextVisible &&");
    expect(source).toContain("!window.confirm(");
    expect(source).toContain("visibilitySavingIdsRef.current.has(node.id)");
    expect(source).not.toContain(
      "JSON.stringify({ isVisible: nextVisible, isActive"
    );
  });
});
