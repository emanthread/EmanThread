-- Stage Men -> Ready to Wear -> Dress Shirt for admin content assignment.
-- It remains hidden/noindex until an admin adds content and publishes it.
INSERT INTO "CatalogNode" (
  "id", "parentId", "nodeType", "productKind", "label", "slug", "path",
  "displayOrder", "isActive", "isVisible", "indexable", "createdAt", "updatedAt"
)
SELECT
  'catalog:leaf:men.ready-to-wear.dress-shirt', parent."id", 'leaf',
  'READY_TO_WEAR', 'DRESS SHIRT', 'dress-shirt',
  '/men/ready-to-wear/dress-shirt', 9, TRUE, FALSE, FALSE,
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "CatalogNode" AS parent
WHERE parent."path" = '/men/ready-to-wear'
ON CONFLICT DO NOTHING;
