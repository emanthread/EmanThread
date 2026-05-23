-- CreateTable
CREATE TABLE "ShippingZone" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "cities" TEXT NOT NULL,
    "provinces" TEXT NOT NULL,
    "shippingRate" DECIMAL NOT NULL,
    "estimatedDays" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "ShippingZone_isActive_idx" ON "ShippingZone"("isActive");
