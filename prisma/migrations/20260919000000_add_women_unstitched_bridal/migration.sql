-- Add Women -> Unstitched -> Bridal Wear without duplicating products.
-- If the legacy root Bridal node still exists, move that same node so its
-- product assignments, banner, and SEO data remain attached through CASCADE.
DO $$
DECLARE
  unstitched_parent_id TEXT;
  legacy_bridal_id TEXT;
BEGIN
  SELECT "id"
  INTO unstitched_parent_id
  FROM "CatalogNode"
  WHERE "path" = '/women/unstitched'
  LIMIT 1;

  SELECT "id"
  INTO legacy_bridal_id
  FROM "CatalogNode"
  WHERE "path" = '/women/bridal-wear'
  LIMIT 1;

  IF unstitched_parent_id IS NOT NULL
    AND legacy_bridal_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM "CatalogNode"
      WHERE "id" = 'catalog:leaf:women.unstitched.bridal-wear'
         OR "path" = '/women/unstitched/bridal-wear'
    )
  THEN
    UPDATE "CatalogNode"
    SET
      "id" = 'catalog:leaf:women.unstitched.bridal-wear',
      "parentId" = unstitched_parent_id,
      "nodeType" = 'leaf',
      "productKind" = 'UNSTITCHED_FABRIC',
      "label" = 'BRIDAL WEAR',
      "slug" = 'bridal-wear',
      "path" = '/women/unstitched/bridal-wear',
      "displayOrder" = 9,
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = legacy_bridal_id;
  END IF;
END $$;

INSERT INTO "CatalogNode" (
  "id", "parentId", "nodeType", "productKind", "label", "slug", "path",
  "displayOrder", "isActive", "isVisible", "indexable", "createdAt", "updatedAt"
)
SELECT
  'catalog:leaf:women.unstitched.bridal-wear', parent."id", 'leaf',
  'UNSTITCHED_FABRIC', 'BRIDAL WEAR', 'bridal-wear',
  '/women/unstitched/bridal-wear', 9, TRUE, TRUE, FALSE,
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "CatalogNode" AS parent
WHERE parent."path" = '/women/unstitched'
ON CONFLICT DO NOTHING;

-- Both occasion categories were explicitly requested for the Unstitched menu.
-- Publish existing Partywear and the canonical Bridal node without changing
-- their product assignments, merchandising content, or SEO index preference.
UPDATE "CatalogNode"
SET
  "isActive" = TRUE,
  "isVisible" = TRUE,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" IN (
  'catalog:leaf:women.unstitched.partywear',
  'catalog:leaf:women.unstitched.bridal-wear'
);
