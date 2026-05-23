/*
  Warnings:

  - You are about to alter the column `endDate` on the `Discount` table. The data in that column could be lost. The data in that column will be cast from `String` to `DateTime`.
  - You are about to alter the column `startDate` on the `Discount` table. The data in that column could be lost. The data in that column will be cast from `String` to `DateTime`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Discount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "buyQuantity" INTEGER,
    "getQuantity" INTEGER,
    "productIds" TEXT NOT NULL DEFAULT '[]',
    "minPurchase" INTEGER,
    "maxDiscount" INTEGER,
    "usageLimit" INTEGER,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Discount" ("buyQuantity", "code", "createdAt", "endDate", "getQuantity", "id", "isActive", "maxDiscount", "minPurchase", "productIds", "startDate", "type", "updatedAt", "usageCount", "usageLimit", "value") SELECT "buyQuantity", "code", "createdAt", "endDate", "getQuantity", "id", "isActive", "maxDiscount", "minPurchase", "productIds", "startDate", "type", "updatedAt", "usageCount", "usageLimit", "value" FROM "Discount";
DROP TABLE "Discount";
ALTER TABLE "new_Discount" RENAME TO "Discount";
CREATE UNIQUE INDEX "Discount_code_key" ON "Discount"("code");
CREATE INDEX "Discount_isActive_idx" ON "Discount"("isActive");
CREATE INDEX "Discount_startDate_idx" ON "Discount"("startDate");
CREATE INDEX "Discount_endDate_idx" ON "Discount"("endDate");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
