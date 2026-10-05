import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { productCardSelect } from "@/lib/queries";

const PAGE_SIZE = 24;

/**
 * Lightweight product listing API for client-side fetching.
 * Supports filtering, sorting, and pagination for the storefront category grids.
 *
 * GET /api/store/products?categoryId=xxx&page=1
 * GET /api/store/products?brandId=xxx&page=1
 * GET /api/store/products?categoryId=xxx&brandId=xxx&page=1
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const categoryId = searchParams.get("categoryId");
  const brandId = searchParams.get("brandId");
  const inStockOnly = searchParams.get("inStock") === "true";
  const sort = searchParams.get("sort");
  const page = Math.max(1, Number(searchParams.get("page") || "1"));

  const where: Prisma.ProductWhereInput = { isArchived: false };
  if (categoryId) where.categoryId = categoryId;
  if (brandId) where.brandId = brandId;
  if (inStockOnly) where.inStock = true;

  const orderBy: Prisma.ProductOrderByWithRelationInput[] =
    sort === "price-asc"
      ? [{ inStock: "desc" }, { price: "asc" }, { name: "asc" }]
      : sort === "price-desc"
        ? [{ inStock: "desc" }, { price: "desc" }, { name: "asc" }]
        : [
            { inStock: "desc" },
            { isFeatured: "desc" },
            { featuredOrder: "asc" },
            { name: "asc" },
          ];

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      select: productCardSelect,
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.product.count({ where }),
  ]);

  return NextResponse.json(
    { products, total, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    }
  );
}
