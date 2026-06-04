-- Add audit fields to OrderItemMeasurement for admin edit tracking
-- updatedBy: admin user ID who last modified the measurement snapshot
-- updatedAt: auto-populated by Prisma @updatedAt when record is updated

ALTER TABLE "OrderItemMeasurement" ADD COLUMN "updatedAt" TIMESTAMP(3);
ALTER TABLE "OrderItemMeasurement" ADD COLUMN "updatedBy" TEXT;