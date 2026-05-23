-- AlterTable
ALTER TABLE "Order" ADD COLUMN "couponCode" TEXT;
ALTER TABLE "Order" ADD COLUMN "discountAmount" DECIMAL;

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
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Discount" ("code", "createdAt", "endDate", "id", "isActive", "maxDiscount", "minPurchase", "startDate", "type", "updatedAt", "usageCount", "usageLimit", "value") SELECT "code", "createdAt", "endDate", "id", "isActive", "maxDiscount", "minPurchase", "startDate", "type", "updatedAt", "usageCount", "usageLimit", "value" FROM "Discount";
DROP TABLE "Discount";
ALTER TABLE "new_Discount" RENAME TO "Discount";
CREATE UNIQUE INDEX "Discount_code_key" ON "Discount"("code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
