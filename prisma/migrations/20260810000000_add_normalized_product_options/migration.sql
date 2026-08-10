-- Additive multi-axis product option architecture. Existing ProductVariant
-- rows remain the inventory identity used by carts and historical orders.
CREATE TYPE "ProductOptionType" AS ENUM (
  'COLOR', 'SIZE', 'SHADE', 'VOLUME', 'STYLE', 'FORMAT', 'CUSTOM'
);

ALTER TABLE "OrderItemConfiguration" ADD COLUMN "variantImage" TEXT;
ALTER TABLE "ProductCommerceProfile" ADD COLUMN "minPrice" DECIMAL(65,30);
ALTER TABLE "ProductCommerceProfile" ADD COLUMN "maxPrice" DECIMAL(65,30);

CREATE TABLE "ProductOption" (
  "id" TEXT NOT NULL,
  "commerceProfileId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "type" "ProductOptionType" NOT NULL DEFAULT 'CUSTOM',
  "isRequired" BOOLEAN NOT NULL DEFAULT true,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductOption_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductOptionValue" (
  "id" TEXT NOT NULL,
  "optionId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "swatchHex" TEXT,
  "images" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductOptionValue_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductVariantSelection" (
  "id" TEXT NOT NULL,
  "variantId" TEXT NOT NULL,
  "optionId" TEXT NOT NULL,
  "optionValueId" TEXT NOT NULL,
  CONSTRAINT "ProductVariantSelection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductOption_commerceProfileId_key_key"
  ON "ProductOption"("commerceProfileId", "key");
CREATE INDEX "ProductOption_commerceProfileId_displayOrder_idx"
  ON "ProductOption"("commerceProfileId", "displayOrder");
CREATE INDEX "ProductOption_type_idx" ON "ProductOption"("type");
CREATE UNIQUE INDEX "ProductOptionValue_optionId_key_key"
  ON "ProductOptionValue"("optionId", "key");
CREATE UNIQUE INDEX "ProductOptionValue_id_optionId_key"
  ON "ProductOptionValue"("id", "optionId");
CREATE INDEX "ProductOptionValue_optionId_isActive_displayOrder_idx"
  ON "ProductOptionValue"("optionId", "isActive", "displayOrder");
CREATE UNIQUE INDEX "ProductVariantSelection_variantId_optionId_key"
  ON "ProductVariantSelection"("variantId", "optionId");
CREATE INDEX "ProductVariantSelection_optionValueId_variantId_idx"
  ON "ProductVariantSelection"("optionValueId", "variantId");
CREATE INDEX "ProductVariantSelection_optionId_optionValueId_idx"
  ON "ProductVariantSelection"("optionId", "optionValueId");

ALTER TABLE "ProductOption" ADD CONSTRAINT "ProductOption_commerceProfileId_fkey"
  FOREIGN KEY ("commerceProfileId") REFERENCES "ProductCommerceProfile"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductOptionValue" ADD CONSTRAINT "ProductOptionValue_optionId_fkey"
  FOREIGN KEY ("optionId") REFERENCES "ProductOption"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductVariantSelection" ADD CONSTRAINT "ProductVariantSelection_variantId_fkey"
  FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductVariantSelection" ADD CONSTRAINT "ProductVariantSelection_optionId_fkey"
  FOREIGN KEY ("optionId") REFERENCES "ProductOption"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductVariantSelection" ADD CONSTRAINT "ProductVariantSelection_optionValueId_fkey"
  FOREIGN KEY ("optionValueId", "optionId") REFERENCES "ProductOptionValue"("id", "optionId")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill every existing single-axis profile. Deterministic IDs make this
-- migration inspectable and keep the original ProductVariant IDs untouched.
INSERT INTO "ProductOption" (
  "id", "commerceProfileId", "key", "label", "type", "isRequired",
  "displayOrder", "createdAt", "updatedAt"
)
SELECT
  'opt_' || md5(p."id" || ':legacy-axis'),
  p."id",
  CASE
    WHEN p."productKind" = 'UNSTITCHED_FABRIC'
      AND lower(COALESCE(p."optionLabel", '')) = 'color' THEN 'color'
    WHEN p."productKind" IN ('READY_TO_WEAR', 'TEENS') THEN 'size'
    WHEN p."productKind" = 'BEAUTY' AND EXISTS (
      SELECT 1
      FROM "ProductCatalogAssignment" assignment
      JOIN "CatalogNode" node ON node."id" = assignment."catalogNodeId"
      WHERE assignment."productId" = p."productId"
        AND node."path" LIKE '%/makeup%'
        AND node."path" NOT LIKE '%/makeup/accessories%'
    ) THEN 'shade'
    WHEN p."productKind" = 'FRAGRANCE' THEN 'volume'
    ELSE COALESCE(NULLIF(lower(regexp_replace(p."optionLabel", '[^a-zA-Z0-9]+', '-', 'g')), ''), 'option')
  END,
  COALESCE(NULLIF(btrim(p."optionLabel"), ''),
    CASE
      WHEN p."productKind" = 'UNSTITCHED_FABRIC'
        AND lower(COALESCE(p."optionLabel", '')) = 'color' THEN 'Color'
      WHEN p."productKind" IN ('READY_TO_WEAR', 'TEENS') THEN 'Size'
      WHEN p."productKind" = 'BEAUTY' AND EXISTS (
        SELECT 1
        FROM "ProductCatalogAssignment" assignment
        JOIN "CatalogNode" node ON node."id" = assignment."catalogNodeId"
        WHERE assignment."productId" = p."productId"
          AND node."path" LIKE '%/makeup%'
          AND node."path" NOT LIKE '%/makeup/accessories%'
      ) THEN 'Shade'
      WHEN p."productKind" = 'FRAGRANCE' THEN 'Volume'
      ELSE 'Option'
    END),
  CASE
    WHEN p."productKind" = 'UNSTITCHED_FABRIC'
      AND lower(COALESCE(p."optionLabel", '')) = 'color' THEN 'COLOR'::"ProductOptionType"
    WHEN p."productKind" IN ('READY_TO_WEAR', 'TEENS') THEN 'SIZE'::"ProductOptionType"
    WHEN p."productKind" = 'BEAUTY' AND EXISTS (
      SELECT 1
      FROM "ProductCatalogAssignment" assignment
      JOIN "CatalogNode" node ON node."id" = assignment."catalogNodeId"
      WHERE assignment."productId" = p."productId"
        AND node."path" LIKE '%/makeup%'
        AND node."path" NOT LIKE '%/makeup/accessories%'
    ) THEN 'SHADE'::"ProductOptionType"
    WHEN p."productKind" = 'FRAGRANCE' THEN 'VOLUME'::"ProductOptionType"
    ELSE 'CUSTOM'::"ProductOptionType"
  END,
  p."requiresSelection",
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "ProductCommerceProfile" p
WHERE EXISTS (
  SELECT 1 FROM "ProductVariant" v WHERE v."commerceProfileId" = p."id"
);

INSERT INTO "ProductOptionValue" (
  "id", "optionId", "key", "label", "swatchHex", "images", "isActive",
  "displayOrder", "createdAt", "updatedAt"
)
SELECT
  'val_' || md5(v."id" || ':legacy-value'),
  'opt_' || md5(v."commerceProfileId" || ':legacy-axis'),
  v."optionKey",
  v."label",
  v."colorHex",
  v."images",
  v."isActive",
  v."displayOrder",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "ProductVariant" v;

UPDATE "ProductCommerceProfile" p
SET
  "minPrice" = prices."minPrice",
  "maxPrice" = prices."maxPrice"
FROM (
  SELECT
    v."commerceProfileId",
    MIN(product."price" + v."priceAdjustment") AS "minPrice",
    MAX(product."price" + v."priceAdjustment") AS "maxPrice"
  FROM "ProductVariant" v
  JOIN "ProductCommerceProfile" profile ON profile."id" = v."commerceProfileId"
  JOIN "Product" product ON product."id" = profile."productId"
  WHERE v."isActive" = true
  GROUP BY v."commerceProfileId"
) prices
WHERE p."id" = prices."commerceProfileId";

INSERT INTO "ProductVariantSelection" (
  "id", "variantId", "optionId", "optionValueId"
)
SELECT
  'sel_' || md5(v."id" || ':legacy-selection'),
  v."id",
  'opt_' || md5(v."commerceProfileId" || ':legacy-axis'),
  'val_' || md5(v."id" || ':legacy-value')
FROM "ProductVariant" v;
