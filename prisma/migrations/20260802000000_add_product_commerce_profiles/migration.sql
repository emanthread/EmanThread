-- Additive merchandise profiles and order-option snapshots.
-- This migration does not alter, update, delete, or backfill existing Product,
-- Category, FabricType, Order, or OrderItem records.

DO $$
BEGIN
  CREATE TYPE "ProductKind" AS ENUM (
    'UNSTITCHED_FABRIC',
    'READY_TO_WEAR',
    'FRAGRANCE',
    'BEAUTY',
    'TEENS',
    'GIFT',
    'GIFT_BOX',
    'ACCESSORY'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "ProductCommerceProfile" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "productKind" "ProductKind" NOT NULL DEFAULT 'UNSTITCHED_FABRIC',
  "stitchingEligible" BOOLEAN NOT NULL DEFAULT true,
  "requiresSelection" BOOLEAN NOT NULL DEFAULT false,
  "optionLabel" TEXT,
  "sizeGuideUrl" TEXT,
  "details" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductCommerceProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ProductVariant" (
  "id" TEXT NOT NULL,
  "commerceProfileId" TEXT NOT NULL,
  "optionKey" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "sku" TEXT,
  "priceAdjustment" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "stockQuantity" INTEGER NOT NULL DEFAULT 0,
  "inStock" BOOLEAN NOT NULL DEFAULT true,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "OrderItemConfiguration" (
  "id" TEXT NOT NULL,
  "orderItemId" TEXT NOT NULL,
  "productVariantId" TEXT,
  "variantSku" TEXT,
  "variantLabel" TEXT,
  "selectedOptions" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderItemConfiguration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProductCommerceProfile_productId_key"
  ON "ProductCommerceProfile"("productId");
CREATE INDEX IF NOT EXISTS "ProductCommerceProfile_productKind_idx"
  ON "ProductCommerceProfile"("productKind");
CREATE INDEX IF NOT EXISTS "ProductCommerceProfile_stitchingEligible_idx"
  ON "ProductCommerceProfile"("stitchingEligible");
CREATE UNIQUE INDEX IF NOT EXISTS "ProductVariant_sku_key"
  ON "ProductVariant"("sku");
CREATE UNIQUE INDEX IF NOT EXISTS "ProductVariant_commerceProfileId_optionKey_key"
  ON "ProductVariant"("commerceProfileId", "optionKey");
CREATE INDEX IF NOT EXISTS "ProductVariant_commerceProfileId_isActive_displayOrder_idx"
  ON "ProductVariant"("commerceProfileId", "isActive", "displayOrder");
CREATE INDEX IF NOT EXISTS "ProductVariant_inStock_stockQuantity_idx"
  ON "ProductVariant"("inStock", "stockQuantity");
CREATE UNIQUE INDEX IF NOT EXISTS "OrderItemConfiguration_orderItemId_key"
  ON "OrderItemConfiguration"("orderItemId");
CREATE INDEX IF NOT EXISTS "OrderItemConfiguration_productVariantId_idx"
  ON "OrderItemConfiguration"("productVariantId");

DO $$
BEGIN
  ALTER TABLE "ProductCommerceProfile"
    ADD CONSTRAINT "ProductCommerceProfile_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "ProductVariant"
    ADD CONSTRAINT "ProductVariant_commerceProfileId_fkey"
    FOREIGN KEY ("commerceProfileId") REFERENCES "ProductCommerceProfile"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "OrderItemConfiguration"
    ADD CONSTRAINT "OrderItemConfiguration_orderItemId_fkey"
    FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
