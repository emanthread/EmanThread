import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

const source = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

test.describe("Women Partywear, Bridal, and Saari catalog expansion", () => {
  test("preserves the existing unstitched Partywear node and assignments", () => {
    const migration = source(
      "prisma/migrations/20260831000000_expand_women_party_bridal_saari_catalog/migration.sql"
    );

    expect(migration).toContain("/women/partywear");
    expect(migration).toContain("/women/unstitched/partywear");
    expect(migration).toContain(
      '"id" = \'catalog:leaf:women.unstitched.partywear\''
    );
    expect(migration).toContain('"parentId" = unstitched_parent_id');
    expect(migration).not.toMatch(/DELETE\s+FROM\s+"Product"/i);
    expect(migration).not.toMatch(/UPDATE\s+"Product"/i);
    expect(migration).not.toMatch(/DELETE\s+FROM\s+"ProductCatalogAssignment"/i);
  });

  test("stages new sellable destinations until content is ready", () => {
    const migration = source(
      "prisma/migrations/20260831000000_expand_women_party_bridal_saari_catalog/migration.sql"
    );

    for (const path of [
      "/women/ready-to-wear/partywear",
      "/women/ready-to-wear/bridal-wear",
      "/women/unstitched/saari-blouse",
    ]) {
      expect(migration).toContain(path);
    }
    expect(migration.match(/TRUE, FALSE, FALSE/g)).toHaveLength(4);
  });

  test("reuses admin multi-placement and catalog filtering", () => {
    const assignmentEditor = source(
      "components/admin/product-catalog-assignment-section.tsx"
    );
    const productList = source("components/admin/product-list-page.tsx");

    expect(assignmentEditor).toContain("Choose another category");
    expect(assignmentEditor).toContain("Add placement");
    expect(assignmentEditor).toContain("...assignments.filter(");
    expect(productList).toContain(
      '"/api/admin/catalog/nodes?active=true&visible=all&limit=1000"'
    );
    expect(productList).toContain("catalogNodeId: catalogNodeFilter");
    expect(productList).toContain("catalogFilterBreadcrumb(node, catalogNodes)");
  });
});
