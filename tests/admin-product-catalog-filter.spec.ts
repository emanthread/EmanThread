import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import {
  InvalidAdminCatalogNodeFilterError,
  resolveAdminCatalogNodeScopeIds,
} from "../lib/db/products";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("admin product catalog filtering is distinct from legacy fabric filtering", () => {
  const list = source("components/admin/product-list-page.tsx");
  const store = source("lib/admin-store.ts");
  const route = source("app/api/admin/products/route.ts");

  expect(list).toContain("All fabrics");
  expect(list).toContain("All catalog categories");
  expect(list).toContain("Search catalog categories...");
  expect(list).toContain(
    "/api/admin/catalog/nodes?active=true&visible=all&limit=1000"
  );
  expect(store).toContain('url.searchParams.set("category", fabricType)');
  expect(store).toContain(
    'url.searchParams.set("catalogNodeId", catalogNodeId)'
  );
  expect(route).toContain(
    "const fabricType = searchParams.get('category') || undefined"
  );
  expect(route).toContain('searchParams.get("catalogNodeId")');
  expect(route).toContain("!FEATURE_FLAGS.CATALOG_ADMIN_ASSIGNMENTS_V1");
  expect(source("lib/db/products.ts")).toContain(
    "if (!FEATURE_FLAGS.CATALOG_ADMIN_ASSIGNMENTS_V1)"
  );
});

test("catalog scope lookup accepts staged active nodes, expands descendants, and rejects inactive nodes", async () => {
  const requestedIds: string[] = [];
  const scopeIds = await resolveAdminCatalogNodeScopeIds("rtw", {
    findSelectedNode: async (catalogNodeId) => {
      requestedIds.push(catalogNodeId);
      return {
        id: "rtw",
        path: "/men/ready-to-wear",
        isActive: true,
      };
    },
    findActiveScopeIds: async (selectedNode) => {
      expect(selectedNode).toEqual({
        id: "rtw",
        path: "/men/ready-to-wear",
        isActive: true,
      });
      // Visibility is intentionally absent: hidden active nodes are manageable
      // in admin before publication.
      return ["rtw", "2-piece", "3-piece", "2-piece"];
    },
  });

  expect(requestedIds).toEqual(["rtw"]);
  expect(scopeIds).toEqual(["rtw", "2-piece", "3-piece"]);

  await expect(
    resolveAdminCatalogNodeScopeIds("inactive", {
      findSelectedNode: async () => ({
        id: "inactive",
        path: "/men/ready-to-wear/inactive",
        isActive: false,
      }),
      findActiveScopeIds: async () => {
        throw new Error("inactive scope must not be queried");
      },
    })
  ).rejects.toBeInstanceOf(InvalidAdminCatalogNodeFilterError);
});

test("server validates active nodes and filters any assignment in the active descendant scope", () => {
  const products = source("lib/db/products.ts");

  expect(products).toContain("if (!selectedNode?.isActive)");
  expect(products).toContain(
    '{ path: { startsWith: `${selectedNode.path}/` } }'
  );
  expect(products).toContain("isActive: true");
  expect(products).toContain("where.catalogAssignments = {");
  expect(products).toContain(
    "some: { catalogNodeId: { in: catalogNodeIds } }"
  );
  expect(products.indexOf("where.catalogAssignments = {")).toBeLessThan(
    products.indexOf("prisma.product.findMany({", products.indexOf("export async function getAdminProducts"))
  );
});

test("admin list presents one natural category without placement flags", () => {
  const list = source("components/admin/product-list-page.tsx");
  const store = source("lib/admin-store.ts");
  const products = source("lib/db/products.ts");

  expect(list).toMatch(/<th[^>]*>\s*Category\s*<\/th>/);
  expect(list).not.toContain("additionalCatalogPlacements(product)");
  expect(list).not.toContain("total catalog placements");
  expect(store).toContain("catalogPlacementCount?: number");
  expect(products).toContain(
    "_count: { select: { catalogAssignments: true } }"
  );
  expect(products).toContain("catalogPlacementCount:");
});
