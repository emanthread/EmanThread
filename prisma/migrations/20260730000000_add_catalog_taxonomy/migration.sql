-- Additive catalog taxonomy.
-- This migration creates new catalog-only tables, indexes, and foreign keys.
-- It does not alter the columns or data of any existing table.

-- CreateTable
CREATE TABLE "CatalogNode" (
    "id" TEXT NOT NULL,
    "parentId" TEXT,
    "nodeType" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "description" TEXT,
    "bannerImage" TEXT,
    "bannerAlt" TEXT,
    "featuredContent" JSONB,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "canonicalOverride" TEXT,
    "indexable" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "isVisible" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCatalogAssignment" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "catalogNodeId" TEXT NOT NULL,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductCatalogAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CatalogNode_path_key" ON "CatalogNode"("path");

-- CreateIndex
CREATE INDEX "CatalogNode_parentId_idx" ON "CatalogNode"("parentId");

-- CreateIndex
CREATE INDEX "CatalogNode_parentId_displayOrder_idx" ON "CatalogNode"("parentId", "displayOrder");

-- CreateIndex
CREATE INDEX "CatalogNode_nodeType_displayOrder_idx" ON "CatalogNode"("nodeType", "displayOrder");

-- CreateIndex
CREATE INDEX "CatalogNode_isActive_isVisible_idx" ON "CatalogNode"("isActive", "isVisible");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCatalogAssignment_productId_catalogNodeId_key" ON "ProductCatalogAssignment"("productId", "catalogNodeId");

-- CreateIndex
CREATE INDEX "ProductCatalogAssignment_productId_idx" ON "ProductCatalogAssignment"("productId");

-- CreateIndex
CREATE INDEX "ProductCatalogAssignment_catalogNodeId_idx" ON "ProductCatalogAssignment"("catalogNodeId");

-- CreateIndex
CREATE INDEX "ProductCatalogAssignment_catalogNodeId_isFeatured_displayOrder_idx" ON "ProductCatalogAssignment"("catalogNodeId", "isFeatured", "displayOrder");

-- AddForeignKey
ALTER TABLE "CatalogNode" ADD CONSTRAINT "CatalogNode_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "CatalogNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCatalogAssignment" ADD CONSTRAINT "ProductCatalogAssignment_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCatalogAssignment" ADD CONSTRAINT "ProductCatalogAssignment_catalogNodeId_fkey" FOREIGN KEY ("catalogNodeId") REFERENCES "CatalogNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
