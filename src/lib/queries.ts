import type { Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { PAGE_SIZE } from "@/components/Pagination";

/** Everything a ProductCard needs, and nothing more. */
export const productCardSelect = {
  id: true,
  name: true,
  slug: true,
  price: true,
  mrp: true,
  variant: true,
  imageUrl: true,
  inStock: true,
  brand: { select: { name: true, slug: true } },
} satisfies Prisma.ProductSelect;

export function parsePage(value: string | undefined): number {
  const n = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/**
 * One paginated product query used by every listing page. In-stock items sort
 * first so an out-of-stock run never pushes orderable products off page one.
 */
export async function listProducts(where: Prisma.ProductWhereInput, page: number) {
  return unstable_cache(
    async () => {
      const combinedWhere: Prisma.ProductWhereInput = {
        isArchived: false,
        ...where,
      };
      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where: combinedWhere,
          select: productCardSelect,
          orderBy: [{ inStock: "desc" }, { name: "asc" }],
          skip: (page - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
        }),
        prisma.product.count({ where: combinedWhere }),
      ]);

      return {
        products,
        total,
        totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      };
    },
    ['list-products', JSON.stringify(where), String(page)],
    { revalidate: 300, tags: ['products'] }
  )();
}

/** Products anywhere beneath a top-level category. */
export function underCategory(categoryId: string, childIds: string[]): Prisma.ProductWhereInput {
  return childIds.length > 0
    ? { categoryId: { in: childIds } }
    : { categoryId };
}

/** Brands that actually have products in a given set of categories. */
export async function brandsInCategories(categoryIds: string[]) {
  return unstable_cache(
    async () => {
      const grouped = await prisma.product.groupBy({
        by: ["brandId"],
        where: { categoryId: { in: categoryIds }, brandId: { not: null }, isArchived: false },
        _count: { _all: true },
      });

      const ids = grouped.map((g) => g.brandId!).filter(Boolean);
      if (ids.length === 0) return [];

      const brands = await prisma.brand.findMany({
        where: { id: { in: ids }, isActive: true },
        select: { id: true, name: true, slug: true },
        orderBy: { name: "asc" },
      });

      const counts = new Map(grouped.map((g) => [g.brandId, g._count._all]));
      return brands.map((b) => ({ ...b, count: counts.get(b.id) ?? 0 }));
    },
    ['brands-in-categories', ...categoryIds],
    { revalidate: 300, tags: ['brands'] }
  )();
}
