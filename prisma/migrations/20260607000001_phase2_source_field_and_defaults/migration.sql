-- Phase 2 (patched): Add source field only
-- status and requestedAt columns not present in DB, steps skipped

-- Step 1: Add source column
ALTER TABLE "MeasurementProfile" ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'profile';

-- Step 2: Skipped (requestedAt not present)
-- Step 3: Skipped (status not present)
-- Step 4: Skipped (requestedAt not present)

-- Step 5: Add index on source
CREATE INDEX IF NOT EXISTS "MeasurementProfile_source_idx" ON "MeasurementProfile" ("source");