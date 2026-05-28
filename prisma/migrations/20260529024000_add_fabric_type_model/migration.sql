-- Convert Product.fabricType from enum to TEXT
-- Step 1: Add a temporary nullable TEXT column
ALTER TABLE "Product" ADD COLUMN "fabricType_new" TEXT;

-- Step 2: Copy existing enum values as text
UPDATE "Product" SET "fabricType_new" = "fabricType"::text;

-- Step 3: Make the new column NOT NULL now that data is populated
ALTER TABLE "Product" ALTER COLUMN "fabricType_new" SET NOT NULL;

-- Step 4: Drop the old enum column
ALTER TABLE "Product" DROP COLUMN "fabricType";

-- Step 5: Rename the new column to the original name
ALTER TABLE "Product" RENAME COLUMN "fabricType_new" TO "fabricType";

-- Step 6: Drop the old PostgreSQL enum type so we can reuse the name
DROP TYPE IF EXISTS "FabricType";

-- Now create the FabricType table (no longer conflicts with the dropped enum)
CREATE TABLE "FabricType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FabricType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FabricType_name_key" ON "FabricType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "FabricType_slug_key" ON "FabricType"("slug");

-- CreateIndex
CREATE INDEX "FabricType_isActive_idx" ON "FabricType"("isActive");

-- Seed initial fabric types
INSERT INTO "FabricType" ("id", "name", "slug", "description", "isActive", "createdAt", "updatedAt") VALUES
  ('ft-cotton', 'Cotton', 'cotton', 'Breathable cotton fabric for everyday comfort', true, NOW(), NOW()),
  ('ft-wash-wear', 'Wash & Wear', 'wash-and-wear', 'Easy-care wrinkle-resistant fabric', true, NOW(), NOW()),
  ('ft-boski', 'Boski', 'boski', 'Luxurious silk-cotton blend fabric', true, NOW(), NOW()),
  ('ft-wool-blend', 'Wool Blend', 'wool-blend', 'Premium wool blend for winter warmth', true, NOW(), NOW()),
  ('ft-khaddar', 'Khaddar', 'khaddar', 'Traditional handwoven fabric', true, NOW(), NOW());