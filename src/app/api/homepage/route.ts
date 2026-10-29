import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { badRequest } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { getHomepageSection, homepageSections, type HomepageSectionKey } from "@/lib/homepage";
import { getTopOffers } from "@/lib/offers";

export const runtime = "nodejs";

const MAX_ITEMS_PER_SHELF = 12;
const sectionSchema = z.enum(["popularCategories", "popularProducts", "topOffers", "brands"]);
const addSchema = z.object({ section: sectionSchema, targetId: z.string().min(1) });
const reorderSchema = z.object({
  section: sectionSchema,
  itemIds: z.array(z.string().min(1)).min(1).max(MAX_ITEMS_PER_SHELF),
});
const removeSchema = z.object({ itemId: z.string().min(1) });

function sectionKeyFor(value: string): HomepageSectionKey | null {
  return getHomepageSection(value) ? (value as HomepageSectionKey) : null;
}

function nameFilter(query: string) {
  return query ? { contains: query, mode: "insensitive" as const } : undefined;
}

/** Search only candidates that are eligible for the selected storefront shelf. */
export async function GET(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const key = sectionKeyFor(req.nextUrl.searchParams.get("section") ?? "");
  if (!key) return badRequest("Choose a homepage section");

  const query = req.nextUrl.searchParams.get("q")?.trim().slice(0, 100) ?? "";
  const filter = nameFilter(query);

  if (key === "popularCategories") {
    const rows = await prisma.category.findMany({
      where: { parentId: { not: null }, isActive: true, ...(filter ? { name: filter } : {}) },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        parent: { select: { name: true } },
      },
      orderBy: [{ parent: { name: "asc" } }, { sortOrder: "asc" }, { name: "asc" }],
      take: 12,
    });
    return NextResponse.json({
      candidates: rows.map((row) => ({
        id: row.id,
        title: row.name,
        detail: row.parent?.name ?? "Subcategory",
        imageUrl: row.imageUrl,
      })),
    });
  }

  if (key === "popularProducts") {
    const rows = await prisma.product.findMany({
      where: { isArchived: false, inStock: true, ...(filter ? { name: filter } : {}) },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        variant: true,
        brand: { select: { name: true } },
      },
      orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
      take: 12,
    });
    return NextResponse.json({
      candidates: rows.map((row) => ({
        id: row.id,
        title: row.name,
        detail: [row.brand?.name, row.variant].filter(Boolean).join(" · ") || "In stock",
        imageUrl: row.imageUrl,
      })),
    });
  }

  if (key === "topOffers") {
    if (!query) {
      const offers = await getTopOffers(12);
      return NextResponse.json({
        candidates: offers.products.map((product) => ({
          id: product.id,
          title: product.name,
          detail: `${Math.round(((product.mrp! - product.price) / product.mrp!) * 100)}% off${product.brand ? ` · ${product.brand.name}` : ""}`,
          imageUrl: product.imageUrl,
        })),
      });
    }
    const rows = await prisma.product.findMany({
      where: { isArchived: false, inStock: true, mrp: { not: null }, ...(filter ? { name: filter } : {}) },
      select: { id: true, name: true, imageUrl: true, price: true, mrp: true, brand: { select: { name: true } } },
      orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
      take: 40,
    });
    return NextResponse.json({
      candidates: rows
        .filter((row) => row.mrp != null && row.mrp > row.price)
        .slice(0, 12)
        .map((row) => ({
          id: row.id,
          title: row.name,
          detail: `${Math.round(((row.mrp! - row.price) / row.mrp!) * 100)}% off${row.brand ? ` · ${row.brand.name}` : ""}`,
          imageUrl: row.imageUrl,
        })),
    });
  }

  const rows = await prisma.brand.findMany({
    where: {
      isActive: true,
      products: { some: { isArchived: false } },
      ...(filter ? { name: filter } : {}),
    },
    select: { id: true, name: true, logoUrl: true, _count: { select: { products: { where: { isArchived: false } } } } },
    orderBy: query ? { name: "asc" } : { products: { _count: "desc" } },
    take: 12,
  });
  return NextResponse.json({
    candidates: rows.map((row) => ({
      id: row.id,
      title: row.name,
      detail: `${row._count.products} products`,
      imageUrl: row.logoUrl,
    })),
  });
}

async function validateTarget(section: HomepageSectionKey, targetId: string) {
  if (section === "popularCategories") {
    const category = await prisma.category.findFirst({
      where: { id: targetId, parentId: { not: null }, isActive: true },
      select: { id: true },
    });
    return category ? { categoryId: category.id } : null;
  }

  if (section === "popularProducts") {
    const product = await prisma.product.findFirst({
      where: { id: targetId, isArchived: false, inStock: true },
      select: { id: true },
    });
    return product ? { productId: product.id } : null;
  }

  if (section === "topOffers") {
    const product = await prisma.product.findFirst({
      where: { id: targetId, isArchived: false, inStock: true, mrp: { not: null } },
      select: { id: true, price: true, mrp: true },
    });
    return product && product.mrp != null && product.mrp > product.price ? { productId: product.id } : null;
  }

  const brand = await prisma.brand.findFirst({
    where: { id: targetId, isActive: true, products: { some: { isArchived: false } } },
    select: { id: true },
  });
  return brand ? { brandId: brand.id } : null;
}

export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = addSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Choose a valid item to add");

  const section = sectionKeyFor(parsed.data.section);
  if (!section) return badRequest("Choose a homepage section");
  const target = await validateTarget(section, parsed.data.targetId);
  if (!target) return badRequest("That item is no longer eligible for this homepage shelf");

  const enumValue = homepageSections[section];
  const [count, last] = await Promise.all([
    prisma.homepageItem.count({ where: { section: enumValue } }),
    prisma.homepageItem.findFirst({ where: { section: enumValue }, orderBy: { sortOrder: "desc" }, select: { sortOrder: true } }),
  ]);
  if (count >= MAX_ITEMS_PER_SHELF) {
    return badRequest(`A homepage shelf can have up to ${MAX_ITEMS_PER_SHELF} items. Remove one first.`);
  }

  try {
    const item = await prisma.homepageItem.create({
      data: { section: enumValue, sortOrder: (last?.sortOrder ?? -1) + 1, ...target },
    });
    revalidatePath("/", "layout");
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return badRequest("That item is already on this homepage shelf");
    }
    throw error;
  }
}

export async function PATCH(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = reorderSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Couldn't save that new order");
  if (new Set(parsed.data.itemIds).size !== parsed.data.itemIds.length) return badRequest("The new order has duplicate items");

  const section = homepageSections[parsed.data.section];
  const rows = await prisma.homepageItem.findMany({
    where: { id: { in: parsed.data.itemIds }, section },
    select: { id: true },
  });
  if (rows.length !== parsed.data.itemIds.length) return badRequest("One or more homepage items no longer exist");

  await prisma.$transaction(
    parsed.data.itemIds.map((id, sortOrder) =>
      prisma.homepageItem.update({ where: { id }, data: { sortOrder } }),
    ),
  );
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = removeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Choose a homepage item to remove");

  await prisma.homepageItem.deleteMany({ where: { id: parsed.data.itemId } });
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
}
