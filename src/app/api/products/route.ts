import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { badRequest, parseBody } from "@/lib/api";
import { productInputSchema } from "@/lib/validation";
import { uniqueSlug } from "@/lib/slug";
import { productCardSelect } from "@/lib/queries";

export const runtime = "nodejs";

const ADMIN_PAGE_SIZE = 24;

/**
 * Private product feed used by the catalog-style admin browser. Keeping this
 * separate from the storefront feed means archived stock is never exposed to
 * a public request.
 */
export async function GET(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { searchParams } = req.nextUrl;
  const categoryId = searchParams.get("categoryId");
  const archived = searchParams.get("archived") === "true";
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);

  const where = {
    isArchived: archived,
    ...(categoryId ? { categoryId } : {}),
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      select: productCardSelect,
      orderBy: [{ inStock: "desc" }, { name: "asc" }],
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
    }),
    prisma.product.count({ where }),
  ]);

  return NextResponse.json(
    { products, total, totalPages: Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)) },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = await parseBody(req, productInputSchema);
  if (!parsed.ok) return parsed.response;
  const input = parsed.data;

  // A product must sit in a leaf category. Putting it on a parent would make
  // it invisible: parent pages list their children's products, not their own.
  const category = await prisma.category.findUnique({
    where: { id: input.categoryId },
    include: { _count: { select: { children: true } } },
  });
  if (!category) {
    return badRequest("That category no longer exists", {
      categoryId: "Choose a category",
    });
  }
  if (category._count.children > 0) {
    return badRequest("Choose a subcategory, not a top-level category", {
      categoryId: `"${category.name}" has subcategories — pick one of those`,
    });
  }

  if (input.brandId) {
    const brand = await prisma.brand.findUnique({ where: { id: input.brandId } });
    if (!brand) return badRequest("That brand no longer exists", { brandId: "Choose a brand" });
  }

  if (input.sku) {
    const clash = await prisma.product.findUnique({ where: { sku: input.sku } });
    if (clash) {
      return badRequest("That SKU is already used", {
        sku: `Already used by "${clash.name}"`,
      });
    }
  }

  const product = await prisma.product.create({
    data: {
      ...input,
      // Generated once, here. Updates never touch it.
      slug: await uniqueSlug("product", input.name),
    },
  });

  return NextResponse.json(product, { status: 201 });
}
