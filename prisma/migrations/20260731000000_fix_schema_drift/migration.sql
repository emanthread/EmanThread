-- Safe additive migration: fix three schema drift items detected by preflight.
-- No existing tables, columns, indexes, or data are modified or dropped.
-- Pre-existing legacy objects (Measurement, *_backup_* tables, etc.) are left untouched.

-- ── 1. Create FailedNotification table ────────────────────────────────────────
-- This table is declared in schema.prisma but was never created in the live DB.
-- It stores async notification delivery failures for retry processing.
CREATE TABLE IF NOT EXISTS "FailedNotification" (
    "id"           TEXT             NOT NULL,
    "orderId"      TEXT,
    "channel"      TEXT             NOT NULL,
    "template"     TEXT             NOT NULL,
    "recipient"    TEXT             NOT NULL,
    "subject"      TEXT,
    "content"      TEXT,
    "errorMessage" TEXT,
    "attemptCount" INTEGER          NOT NULL DEFAULT 0,
    "lastAttempt"  TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt"    TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FailedNotification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "FailedNotification_createdAt_idx" ON "FailedNotification"("createdAt");
CREATE INDEX IF NOT EXISTS "FailedNotification_orderId_idx"   ON "FailedNotification"("orderId");

-- ── 2. Create missing Product.groupId index ───────────────────────────────────
-- Declared via @@index([groupId]) in schema.prisma; missing from live DB.
CREATE INDEX IF NOT EXISTS "Product_groupId_idx" ON "Product"("groupId");

-- ── 3. Rename truncated ProductCatalogAssignment index ────────────────────────
-- PostgreSQL silently truncates identifiers to 63 bytes.
-- The catalog migration created: "ProductCatalogAssignment_catalogNodeId_isFeatured_displayOrder_"
-- Prisma expects:               "ProductCatalogAssignment_catalogNodeId_isFeatured_displayOr_idx"
-- We use a safe DO block so the migration is idempotent.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM   pg_indexes
    WHERE  schemaname = 'public'
      AND  indexname  = 'ProductCatalogAssignment_catalogNodeId_isFeatured_displayOrder_'
  ) THEN
    ALTER INDEX "ProductCatalogAssignment_catalogNodeId_isFeatured_displayOrder_"
      RENAME TO "ProductCatalogAssignment_catalogNodeId_isFeatured_displayOr_idx";
  END IF;
END$$;
