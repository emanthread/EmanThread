-- Migration: add_stitching_delivery_scheduling
-- 
-- SAFE for live production database:
--   1. ALTER TABLE "Order" ADD COLUMN "stitchingDeliveryDate" - nullable, existing rows get NULL
--   2. CREATE TYPE + CREATE TABLE "StitchingCalendarRule" - brand new table, no existing data touched
--   3. CREATE INDEX on the new table
--
-- Apply with: npx prisma migrate deploy

-- CreateEnum
CREATE TYPE "StitchingRuleType" AS ENUM ('BLOCKED_DATE', 'CAPACITY_OVERRIDE', 'BLOCKED_RANGE', 'CAPACITY_RANGE');

-- AlterTable: Add nullable stitching delivery date to Order (existing rows get NULL - safe)
ALTER TABLE "Order" ADD COLUMN "stitchingDeliveryDate" TIMESTAMP(3);

-- CreateTable: Brand new table for admin calendar rules
CREATE TABLE "StitchingCalendarRule" (
    "id" TEXT NOT NULL,
    "type" "StitchingRuleType" NOT NULL,
    "date" TIMESTAMP(3),
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "capacity" INTEGER,
    "label" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StitchingCalendarRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StitchingCalendarRule_type_isActive_idx" ON "StitchingCalendarRule"("type", "isActive");

-- CreateIndex
CREATE INDEX "StitchingCalendarRule_date_idx" ON "StitchingCalendarRule"("date");

-- CreateIndex
CREATE INDEX "StitchingCalendarRule_startDate_endDate_idx" ON "StitchingCalendarRule"("startDate", "endDate");
