-- Fix: Catch tailor requests that were misclassified in Phase 2 backfill
-- because they had empty notes (notes = '') when created via POST /api/tailor-measurements.
-- The original heuristic required notes != '', which silently dropped these records.
UPDATE "MeasurementProfile"
SET "source" = 'tailor_request'
WHERE "requestedAt" IS NOT NULL
  AND "status" = 'pending'
  AND "source" = 'profile'
  AND "notes" = '';