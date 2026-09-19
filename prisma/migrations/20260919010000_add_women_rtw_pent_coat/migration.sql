-- Add Women -> Ready to Wear -> Pent Coat as a published sellable category.
-- Existing products and catalog assignments are intentionally left unchanged.
DO $$
DECLARE
  ready_to_wear_parent_id TEXT;
BEGIN
  SELECT "id"
  INTO ready_to_wear_parent_id
  FROM "CatalogNode"
  WHERE "path" = '/women/ready-to-wear'
  LIMIT 1;

  IF ready_to_wear_parent_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM "CatalogNode"
      WHERE "id" = 'catalog:leaf:women.ready-to-wear.pent-coat'
         OR "path" = '/women/ready-to-wear/pent-coat'
    )
  THEN
    UPDATE "CatalogNode"
    SET
      "displayOrder" = "displayOrder" + 1,
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE "parentId" = ready_to_wear_parent_id
      AND "displayOrder" >= 6;

    INSERT INTO "CatalogNode" (
      "id", "parentId", "nodeType", "productKind", "label", "slug", "path",
      "displayOrder", "isActive", "isVisible", "indexable", "createdAt", "updatedAt"
    )
    VALUES (
      'catalog:leaf:women.ready-to-wear.pent-coat', ready_to_wear_parent_id,
      'leaf', 'READY_TO_WEAR', 'PENT COAT', 'pent-coat',
      '/women/ready-to-wear/pent-coat', 6, TRUE, TRUE, FALSE,
      CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    );
  END IF;
END $$;

-- Publish the canonical node if it was already staged before this migration.
UPDATE "CatalogNode"
SET
  "isActive" = TRUE,
  "isVisible" = TRUE,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'catalog:leaf:women.ready-to-wear.pent-coat';
