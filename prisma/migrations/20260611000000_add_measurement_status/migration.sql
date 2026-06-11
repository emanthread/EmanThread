-- Add status column to MeasurementProfile model
-- This migration handles:
-- 1. Renaming deprecated enum values (complete → approved, cancelled → rejected)
-- 2. Adding the status column with a default value

-- Step 1: Create new enum type with final values
CREATE TYPE "MeasurementProfileStatus_new" AS ENUM ('pending', 'approved', 'rejected');

-- Step 2: Migrate column type
ALTER TABLE "MeasurementProfile" ALTER COLUMN "status" TYPE "MeasurementProfileStatus_new" 
  USING ("status"::text::"MeasurementProfileStatus_new");

-- Step 3: Drop old enum type
DROP TYPE IF EXISTS "MeasurementProfileStatus" CASCADE;

-- Step 4: Rename new to old
ALTER TYPE "MeasurementProfileStatus_new" RENAME TO "MeasurementProfileStatus";

-- Step 5: Add column if it doesn't exist (idempotent)
ALTER TABLE "MeasurementProfile" ADD COLUMN IF NOT EXISTS "status" "MeasurementProfileStatus" NOT NULL DEFAULT 'pending';