-- Phase 2: Add `source` field to distinguish profile types
-- Changes:
--   1. Add `source` column with default 'profile'
--   2. Backfill existing tailor requests (heuristic-based)
--   3. Change `status` default from 'pending' to 'complete'
--   4. Make `requestedAt` nullable (remove default now()) — only set explicitly for tailor requests

-- Step 1: Add source column
ALTER TABLE "MeasurementProfile" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'profile';

-- Step 2: Backfill existing tailor requests
-- Records created via POST /api/tailor-measurements always have:
--   status = 'pending', requestedAt IS NOT NULL, and notes typically populated
-- Records created via POST /api/measurements (profiles) have:
--   status = 'pending' (old default), requestedAt populated (old default), notes = ''
UPDATE "MeasurementProfile" 
SET "source" = 'tailor_request' 
WHERE "requestedAt" IS NOT NULL 
  AND "status" = 'pending'
  AND "notes" != '';

-- Step 3: Change status default from 'pending' to 'complete'
ALTER TABLE "MeasurementProfile" ALTER COLUMN "status" SET DEFAULT 'complete';

-- Step 4: Make requestedAt nullable (remove auto-now() default)
-- requestedAt should only be populated for tailor requests, not regular profiles
ALTER TABLE "MeasurementProfile" ALTER COLUMN "requestedAt" DROP DEFAULT;
ALTER TABLE "MeasurementProfile" ALTER COLUMN "requestedAt" DROP NOT NULL;

-- Step 5: Add index on source for admin filtering
CREATE INDEX "MeasurementProfile_source_idx" ON "MeasurementProfile" ("source");