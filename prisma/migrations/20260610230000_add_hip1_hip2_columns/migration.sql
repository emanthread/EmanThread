-- Add missing hip1 and hip2 columns to MeasurementProfile
-- These columns exist in the Prisma schema but were never migrated to the DB
ALTER TABLE "MeasurementProfile" 
ADD COLUMN "hip1" TEXT NOT NULL DEFAULT '',
ADD COLUMN "hip2" TEXT NOT NULL DEFAULT '';