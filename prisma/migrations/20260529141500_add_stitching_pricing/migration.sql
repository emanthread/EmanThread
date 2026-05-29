-- Create StitchingPrice table
CREATE TABLE "StitchingPrice" (
    "id" TEXT NOT NULL,
    "fabricType" TEXT NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StitchingPrice_pkey" PRIMARY KEY ("id")
);

-- Add unique index on fabricType
CREATE UNIQUE INDEX "StitchingPrice_fabricType_key" ON "StitchingPrice"("fabricType");

-- Add stitching columns to Order table
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "stitchingFee" DECIMAL(65,30) NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "stitchingPaid" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "stitchingSnapshots" JSONB;