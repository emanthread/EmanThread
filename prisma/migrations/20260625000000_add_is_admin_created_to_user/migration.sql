-- Migration: add_is_admin_created_to_user
-- Additive only: adds a single nullable boolean column with a default of FALSE
-- All existing users automatically receive isAdminCreated = false
-- No existing rows, columns, or tables are modified or deleted

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isAdminCreated" BOOLEAN NOT NULL DEFAULT false;



