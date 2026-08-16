import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { productCardSelect } from "@/lib/queries";

const PAGE_SIZE = 24;

/**
 * Lightweight product listing API for client-side fetching.
 * Supports filtering by categoryId and/or brandId with pagination.
 *
 * GET /api/store/products?categoryId=xxx&page=1
 * GET /api/store/products?brandId=xxx&page=1
 * GET /api/store/products?categoryId=xxx&brandId=xxx&page=1
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const categoryId = searchParams.get("categoryId");
  const brandId = searchParams.get("brandId");
  const page = Math.max(1, Number(searchParams.get("page") || "1"));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { isArchived: false };
  if (categoryId) where.categoryId = categoryId;
  if (brandId) where.brandId = brandId;

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      select: productCardSelect,
      orderBy: [{ inStock: "desc" }, { name: "asc" }],
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
