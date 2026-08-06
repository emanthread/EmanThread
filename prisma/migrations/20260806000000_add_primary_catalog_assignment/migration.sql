-- Give every product one stable primary classification while retaining its
-- zero-to-many merchandising placements.
ALTER TABLE "ProductCatalogAssignment"
ADD COLUMN "isPrimary" BOOLEAN NOT NULL DEFAULT false;

WITH ranked_assignments AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "productId"
      ORDER BY "createdAt" ASC, "id" ASC
    ) AS assignment_rank
  FROM "ProductCatalogAssignment"
)
UPDATE "ProductCatalogAssignment" AS assignment
SET "isPrimary" = true
FROM ranked_assignments
WHERE assignment."id" = ranked_assignments."id"
  AND ranked_assignments.assignment_rank = 1;

CREATE INDEX "ProductCatalogAssignment_productId_isPrimary_idx"
ON "ProductCatalogAssignment"("productId", "isPrimary");

-- PostgreSQL partial uniqueness expresses the invariant Prisma's schema
-- language cannot: at most one primary assignment per product.
CREATE UNIQUE INDEX "ProductCatalogAssignment_one_primary_per_product"
ON "ProductCatalogAssignment"("productId")
WHERE "isPrimary" = true;
