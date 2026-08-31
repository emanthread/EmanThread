-- Expand the Women catalog without duplicating Product records.
--
-- Existing Partywear was historically an unstitched root collection. When it
-- exists and the new target is free, move that same CatalogNode (including its
-- assignments, banner, and SEO data through ON UPDATE CASCADE) beneath
-- Women / Unstitched. Brand-new categories are staged hidden so an admin can
-- assign products and content before publishing them.
DO $$
DECLARE
  unstitched_parent_id TEXT;
  legacy_partywear_id TEXT;
BEGIN
  SELECT "id"
  INTO unstitched_parent_id
  FROM "CatalogNode"
  WHERE "path" = '/women/unstitched'
  LIMIT 1;

  SELECT "id"
  INTO legacy_partywear_id
  FROM "CatalogNode"
  WHERE "path" = '/women/partywear'
  LIMIT 1;

  IF unstitched_parent_id IS NOT NULL
    AND legacy_partywear_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM "CatalogNode"
      WHERE "id" = 'catalog:leaf:women.unstitched.partywear'
         OR "path" = '/women/unstitched/partywear'
    )
  THEN
    UPDATE "CatalogNode"
    SET
      "id" = 'catalog:leaf:women.unstitched.partywear',
      "parentId" = unstitched_parent_id,
      "nodeType" = 'leaf',
      "productKind" = 'UNSTITCHED_FABRIC',
      "label" = 'PARTYWEAR',
      "slug" = 'partywear',
      "path" = '/women/unstitched/partywear',
      "displayOrder" = 8,
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = legacy_partywear_id;
  END IF;
END $$;

INSERT INTO "CatalogNode" (
  "id", "parentId", "nodeType", "productKind", "label", "slug", "path",
  "displayOrder", "isActive", "isVisible", "indexable", "createdAt", "updatedAt"
)
SELECT
  'catalog:leaf:women.unstitched.partywear', parent."id", 'leaf',
  'UNSTITCHED_FABRIC', 'PARTYWEAR', 'partywear',
  '/women/unstitched/partywear', 8, TRUE, FALSE, FALSE,
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "CatalogNode" AS parent
WHERE parent."path" = '/women/unstitched'
ON CONFLICT DO NOTHING;

INSERT INTO "CatalogNode" (
  "id", "parentId", "nodeType", "productKind", "label", "slug", "path",
  "displayOrder", "isActive", "isVisible", "indexable", "createdAt", "updatedAt"
)
SELECT
  'catalog:leaf:women.unstitched.saari-blouse', parent."id", 'leaf',
  'UNSTITCHED_FABRIC', 'SAARI BLOUSE', 'saari-blouse',
  '/women/unstitched/saari-blouse', 4, TRUE, FALSE, FALSE,
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "CatalogNode" AS parent
WHERE parent."path" = '/women/unstitched'
ON CONFLICT DO NOTHING;

INSERT INTO "CatalogNode" (
  "id", "parentId", "nodeType", "productKind", "label", "slug", "path",
  "displayOrder", "isActive", "isVisible", "indexable", "createdAt", "updatedAt"
)
SELECT
  'catalog:leaf:women.ready-to-wear.partywear', parent."id", 'leaf',
  'READY_TO_WEAR', 'PARTYWEAR', 'partywear',
  '/women/ready-to-wear/partywear', 10, TRUE, FALSE, FALSE,
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "CatalogNode" AS parent
WHERE parent."path" = '/women/ready-to-wear'
ON CONFLICT DO NOTHING;

INSERT INTO "CatalogNode" (
  "id", "parentId", "nodeType", "productKind", "label", "slug", "path",
  "displayOrder", "isActive", "isVisible", "indexable", "createdAt", "updatedAt"
)
SELECT
  'catalog:leaf:women.ready-to-wear.bridal-wear', parent."id", 'leaf',
  'READY_TO_WEAR', 'BRIDAL WEAR', 'bridal-wear',
  '/women/ready-to-wear/bridal-wear', 11, TRUE, FALSE, FALSE,
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "CatalogNode" AS parent
WHERE parent."path" = '/women/ready-to-wear'
ON CONFLICT DO NOTHING;
