-- Add missing ladTrouserElastic1 field to MeasurementProfile (C1)
ALTER TABLE "MeasurementProfile" ADD COLUMN "ladTrouserElastic1" TEXT NOT NULL DEFAULT '';

-- Add Order indexes (M20, M21)
CREATE INDEX "Order_userId_idx" ON "Order"("userId");
CREATE INDEX "Order_userId_createdAt_idx" ON "Order"("userId", "createdAt");
CREATE INDEX "Order_status_idx" ON "Order"("status");
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");

-- Replace old suboptimal MeasurementProfile index with correct column order (M22)
-- Drop the old index first, then create the new one
DROP INDEX IF EXISTS "MeasurementProfile_userId_profileName_deletedAt_idx";
CREATE INDEX "MeasurementProfile_userId_deletedAt_profileName_idx" ON "MeasurementProfile"("userId", "deletedAt", "profileName");
