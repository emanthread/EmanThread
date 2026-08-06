-- Product behavior is catalog metadata, not a property inferred from a URL.
-- Existing nodes are backfilled from the legacy paths once; new edits use the
-- typed value directly. Generic merchandising landings intentionally remain
-- NULL because they can contain more than one product kind.
ALTER TABLE "CatalogNode" ADD COLUMN "productKind" "ProductKind";

UPDATE "CatalogNode"
SET "productKind" = CASE
  WHEN lower("path") ~ '^/(women|men|teens|fragrance-beauty)$'
    OR lower("path") ~ '^/(women|men|teens|fragrance-beauty)/(new-in|sale)$'
    THEN NULL
  WHEN lower("path") LIKE '%gift-box%' THEN 'GIFT_BOX'::"ProductKind"
  WHEN lower("path") LIKE '%/fragrances%'
    OR lower("path") LIKE '%/perfume%'
    OR lower("path") LIKE '%/attar%'
    OR lower("path") LIKE '%body-mist%'
    OR lower("path") LIKE '%body-spray%'
    OR lower("path") LIKE '%bakhoor%'
    OR lower("path") LIKE '%diffuser%'
    OR lower("path") LIKE '%air-freshener%'
    OR lower("path") LIKE '%scented-candle%'
    OR lower("path") LIKE '/fragrance-beauty/new-in/%'
    THEN 'FRAGRANCE'::"ProductKind"
  WHEN lower("path") LIKE '%/makeup/accessories%' THEN 'ACCESSORY'::"ProductKind"
  WHEN lower("path") LIKE '%/makeup%'
    OR lower("path") LIKE '%/skincare%'
    THEN 'BEAUTY'::"ProductKind"
  WHEN lower("path") LIKE '%gift%' THEN 'GIFT'::"ProductKind"
  WHEN lower("path") LIKE '%accessor%' THEN 'ACCESSORY'::"ProductKind"
  WHEN lower("path") LIKE '/teens/%' THEN 'TEENS'::"ProductKind"
  WHEN lower("path") LIKE '%unstitched%' THEN 'UNSTITCHED_FABRIC'::"ProductKind"
  WHEN lower("path") LIKE '%ready-to-wear%'
    OR lower("path") LIKE '%/rtw-%'
    OR lower("path") LIKE '%/cast-crew/clothing%'
    OR lower("path") LIKE '/women/%'
    OR lower("path") LIKE '/men/%'
    THEN 'READY_TO_WEAR'::"ProductKind"
  ELSE NULL
END;

CREATE INDEX "CatalogNode_productKind_idx" ON "CatalogNode"("productKind");

-- The earlier primary migration could only preserve deterministic legacy
-- order. Now that nodes are typed, discard primaries that are broad, inactive,
-- incompatible with an existing commerce profile, or ambiguous across more
-- than one product kind when no profile exists to resolve the classification.
WITH ambiguous_profileless_products AS (
  SELECT assignment."productId"
  FROM "ProductCatalogAssignment" AS assignment
  JOIN "CatalogNode" AS node ON node."id" = assignment."catalogNodeId"
  LEFT JOIN "ProductCommerceProfile" AS profile
    ON profile."productId" = assignment."productId"
  WHERE profile."id" IS NULL
    AND node."isActive" = true
    AND node."productKind" IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM "CatalogNode" AS child
      WHERE child."parentId" = node."id"
    )
  GROUP BY assignment."productId"
  HAVING COUNT(DISTINCT node."productKind") > 1
)
UPDATE "ProductCatalogAssignment" AS assignment
SET "isPrimary" = false
FROM "CatalogNode" AS node
WHERE assignment."catalogNodeId" = node."id"
  AND assignment."isPrimary" = true
  AND (
    node."isActive" = false
    OR node."productKind" IS NULL
    OR EXISTS (
      SELECT 1 FROM "CatalogNode" AS child
      WHERE child."parentId" = node."id"
    )
    OR EXISTS (
      SELECT 1
      FROM "ProductCommerceProfile" AS profile
      WHERE profile."productId" = assignment."productId"
        AND profile."productKind" <> node."productKind"
    )
    OR assignment."productId" IN (
      SELECT "productId" FROM ambiguous_profileless_products
    )
  );

-- Promote the oldest compatible active leaf only when no valid primary
-- remains. An ambiguous profile-less product deliberately has no automatic
-- candidate and enters the admin's correction queue for an explicit choice.
WITH ambiguous_profileless_products AS (
  SELECT assignment."productId"
  FROM "ProductCatalogAssignment" AS assignment
  JOIN "CatalogNode" AS node ON node."id" = assignment."catalogNodeId"
  LEFT JOIN "ProductCommerceProfile" AS profile
    ON profile."productId" = assignment."productId"
  WHERE profile."id" IS NULL
    AND node."isActive" = true
    AND node."productKind" IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM "CatalogNode" AS child
      WHERE child."parentId" = node."id"
    )
  GROUP BY assignment."productId"
  HAVING COUNT(DISTINCT node."productKind") > 1
), ranked_candidates AS (
  SELECT
    assignment."id",
    ROW_NUMBER() OVER (
      PARTITION BY assignment."productId"
      ORDER BY assignment."createdAt" ASC, assignment."id" ASC
    ) AS candidate_rank
  FROM "ProductCatalogAssignment" AS assignment
  JOIN "CatalogNode" AS node ON node."id" = assignment."catalogNodeId"
  LEFT JOIN "ProductCommerceProfile" AS profile
    ON profile."productId" = assignment."productId"
  WHERE node."isActive" = true
    AND node."productKind" IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM "CatalogNode" AS child
      WHERE child."parentId" = node."id"
    )
    AND (
      profile."id" IS NULL
      OR profile."productKind" = node."productKind"
    )
    AND assignment."productId" NOT IN (
      SELECT "productId" FROM ambiguous_profileless_products
    )
    AND NOT EXISTS (
      SELECT 1
      FROM "ProductCatalogAssignment" AS current_primary
      WHERE current_primary."productId" = assignment."productId"
        AND current_primary."isPrimary" = true
    )
)
UPDATE "ProductCatalogAssignment" AS assignment
SET "isPrimary" = true
FROM ranked_candidates
WHERE assignment."id" = ranked_candidates."id"
  AND ranked_candidates.candidate_rank = 1;
