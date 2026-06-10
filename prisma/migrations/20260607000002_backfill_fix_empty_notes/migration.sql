-- Fix: Skipped — requestedAt and status columns not present in DB.
-- The Phase 2 backfill was already skipped, so there is nothing to fix.
-- This migration is a no-op.
SELECT 1;