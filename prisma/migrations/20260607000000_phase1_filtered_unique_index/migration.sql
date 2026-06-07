-- Phase 1: Replace full unique constraint with partial filtered unique index
-- This fixes soft-delete + unique constraint collision (P2002 errors)
-- Only enforces uniqueness among ACTIVE (non-deleted) records

-- Step 1: Drop the old full unique constraint
DROP INDEX IF EXISTS "MeasurementProfile_userId_profileName_key";

-- Step 2: Drop the old simple composite index (will be recreated by Prisma from schema)
DROP INDEX IF EXISTS "MeasurementProfile_userId_profileName_deletedAt_idx";

-- Step 3: Create composite index (supports fast lookups of all records including soft-deleted)
CREATE INDEX "MeasurementProfile_userId_profileName_deletedAt_idx" 
ON "MeasurementProfile" ("userId", "profileName", "deletedAt");

-- Step 4: Create partial filtered unique index
-- Only enforces uniqueness where deletedAt IS NULL (active records)
-- Soft-deleted records can have duplicate names with active ones
CREATE UNIQUE INDEX "MeasurementProfile_userId_profileName_active_key" 
ON "MeasurementProfile" ("userId", "profileName") 
WHERE "deletedAt" IS NULL;