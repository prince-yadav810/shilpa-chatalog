import { Prisma } from "@prisma/client";
import { PAGE_SIZE } from "@/components/Pagination";
import { prisma } from "@/lib/prisma";
import { productCardSelect } from "@/lib/queries";

type RankedOfferRow = {
  id: string;
  percentOff: number | string;
};

type OfferCountRow = {
  count: number | bigint | string;
};

/**
 * Offers are calculated from the genuine MRP and current selling price. The
 * database performs the ranking, so the home page does not need to load the
 * full catalogue just to find the best saving.
 */
async function rankedOfferRows(take: number, skip = 0) {
  return prisma.$queryRaw<RankedOfferRow[]>(Prisma.sql`
    SELECT
      "id",
      ROUND((("mrp" - "price") / NULLIF("mrp", 0)) * 100)::integer AS "percentOff"
    FROM "Product"
    WHERE "isArchived" = false
      AND "inStock" = true
      AND "mrp" IS NOT NULL
      AND "mrp" > "price"
    ORDER BY
      (("mrp" - "price") / NULLIF("mrp", 0)) DESC,
      "updatedAt" DESC,
      "id" ASC
    LIMIT ${take}
    OFFSET ${skip}
  `);
}

async function productsForRankedRows(rows: RankedOfferRow[]) {
  if (rows.length === 0) return [];

  const products = await prisma.product.findMany({
    where: { id: { in: rows.map((row) => row.id) } },
    select: productCardSelect,
  });
  const byId = new Map(products.map((product) => [product.id, product]));

  return rows.flatMap((row) => {
    const product = byId.get(row.id);
    return product ? [product] : [];
  });
}

export async function getTopOffers(take = 12) {
  const rows = await rankedOfferRows(take);
  const products = await productsForRankedRows(rows);

  return {
    products,
    highestPercentOff: rows.length > 0 ? Number(rows[0].percentOff) : null,
  };
}

export async function getOfferPage(page: number) {
  const safePage = Math.max(1, page);
  const [rows, countRows] = await Promise.all([
    rankedOfferRows(PAGE_SIZE, (safePage - 1) * PAGE_SIZE),
    prisma.$queryRaw<OfferCountRow[]>(Prisma.sql`
      SELECT COUNT(*) AS count
      FROM "Product"
      WHERE "isArchived" = false
        AND "inStock" = true
        AND "mrp" IS NOT NULL
        AND "mrp" > "price"
    `),
  ]);
  const products = await productsForRankedRows(rows);
  const total = Number(countRows[0]?.count ?? 0);

  return {
    products,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}
