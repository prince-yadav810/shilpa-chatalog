import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { badRequest, notFound, parseBody } from "@/lib/api";
import { productInputSchema } from "@/lib/validation";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) return notFound("Product not found");

  const parsed = await parseBody(req, productInputSchema);
  if (!parsed.ok) return parsed.response;
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
      /*
       * An empty SKU never clears an existing one. The SKU is what the monthly
       * catalog import matches on, so silently dropping it would turn the next
       * import into a duplicate rather than an update. Overwriting it with a
       * corrected value still works.
       */
      sku: input.sku ?? existing.sku,
      // slug is deliberately absent: the product URL gets shared into WhatsApp
      // chats, so renaming or repricing must not break links already sent.
    },
  });

  return NextResponse.json(product);
}

export async function DELETE(_req: Request, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) return notFound("Product not found");

  await prisma.product.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
