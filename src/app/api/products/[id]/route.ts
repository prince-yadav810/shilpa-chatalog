import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { badRequest, notFound } from "@/lib/api";
import { productInputSchema } from "@/lib/validation";
import { deleteCloudinaryImage } from "@/lib/cloudinary";
import { removeSearchProducts, syncSearchProduct } from "@/lib/catalog-search";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) return notFound("Product not found");

  const rawJson = await req.json().catch(() => null);
  if (!rawJson) return badRequest("Invalid JSON body");

  // Allow simple archive toggle via PUT as well
  if (Object.keys(rawJson).length === 1 && typeof rawJson.isArchived === "boolean") {
    const product = await prisma.product.update({
      where: { id },
      data: { isArchived: rawJson.isArchived },
    });
    await syncSearchProduct(product.id);
    return NextResponse.json(product);
  }

  const parsed = productInputSchema.safeParse(rawJson);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      if (key && !fields[key]) fields[key] = issue.message;
    }
    return NextResponse.json({ error: "Validation failed", fields }, { status: 400 });
  }

  const input = parsed.data;

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

  if (input.sku && input.sku !== existing.sku) {
    const clash = await prisma.product.findUnique({ where: { sku: input.sku } });
    if (clash) {
      return badRequest("That SKU is already used", {
        sku: `Already used by "${clash.name}"`,
      });
    }
  }

  const product = await prisma.product.update({
    where: { id },
    data: {
      ...input,
      sku: input.sku ?? existing.sku,
    },
  });

  await syncSearchProduct(product.id);

  return NextResponse.json(product);
}

export async function PATCH(req: Request, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) return notFound("Product not found");

  const body = await req.json().catch(() => ({}));

  // The catalog browser can move a product without opening the full editor.
  // Keep the same leaf-category guard as the full product form so a product
  // never disappears into a parent category.
  if (typeof body.categoryId === "string") {
    const category = await prisma.category.findUnique({
      where: { id: body.categoryId },
      include: { _count: { select: { children: true } } },
    });

    if (!category) return badRequest("That category no longer exists");
    if (category._count.children > 0) {
      return badRequest("Choose a subcategory, not a top-level category");
    }

    const product = await prisma.product.update({
      where: { id },
      data: { categoryId: category.id },
    });

    await syncSearchProduct(product.id);

    return NextResponse.json({ ok: true, product });
  }

  const isArchived =
    typeof body.isArchived === "boolean" ? body.isArchived : !existing.isArchived;

  const product = await prisma.product.update({
    where: { id },
    data: { isArchived },
  });
  await syncSearchProduct(product.id);

  return NextResponse.json({ ok: true, product });
}

export async function DELETE(_req: Request, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) return notFound("Product not found");

  // 1. Delete image from Cloudinary CDN if no other product uses the same image URL
  let deletedFromCloudinary = false;
  if (existing.imageUrl) {
    const countOther = await prisma.product.count({
      where: { imageUrl: existing.imageUrl, id: { not: id } },
    });
    if (countOther === 0) {
      deletedFromCloudinary = await deleteCloudinaryImage(existing.imageUrl);
    }
  }

  // 2. Delete product record from PostgreSQL database
  await prisma.product.delete({ where: { id } });
  await removeSearchProducts([id]);

  return NextResponse.json({ ok: true, deletedFromCloudinary });
}
