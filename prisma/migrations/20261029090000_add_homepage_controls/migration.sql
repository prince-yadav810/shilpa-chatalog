-- CreateEnum
CREATE TYPE "HomepageSection" AS ENUM ('POPULAR_CATEGORIES', 'POPULAR_PRODUCTS', 'TOP_OFFERS', 'BRANDS');

-- CreateTable
CREATE TABLE "HomepageItem" (
    "id" TEXT NOT NULL,
    "section" "HomepageSection" NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "categoryId" TEXT,
    "productId" TEXT,
    "brandId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomepageItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HomepageItem_section_sortOrder_idx" ON "HomepageItem"("section", "sortOrder");
CREATE UNIQUE INDEX "HomepageItem_section_categoryId_key" ON "HomepageItem"("section", "categoryId");
CREATE UNIQUE INDEX "HomepageItem_section_productId_key" ON "HomepageItem"("section", "productId");
CREATE UNIQUE INDEX "HomepageItem_section_brandId_key" ON "HomepageItem"("section", "brandId");

-- AddForeignKey
ALTER TABLE "HomepageItem" ADD CONSTRAINT "HomepageItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HomepageItem" ADD CONSTRAINT "HomepageItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HomepageItem" ADD CONSTRAINT "HomepageItem_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
