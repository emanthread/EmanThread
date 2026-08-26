-- Preserve stable catalog IDs, paths, assignments, banners, and SEO while
-- updating the two customer-facing Men / Unstitched category names.
UPDATE "CatalogNode"
SET "label" = 'MEDIUM CLASS', "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'catalog:leaf:men.unstitched.latha';

UPDATE "CatalogNode"
SET "label" = 'COTTON COLLECTION', "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'catalog:leaf:men.unstitched.boski';
