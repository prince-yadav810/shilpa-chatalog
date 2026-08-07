import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { badRequest, conflict, notFound, parseBody } from "@/lib/api";
import { categoryInputSchema } from "@/lib/validation";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  const existing = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { children: true, products: true } } },
  });
  if (!existing) return notFound("Category not found");

  const parsed = await parseBody(req, categoryInputSchema);
  if (!parsed.ok) return parsed.response;
  const input = parsed.data;

  if (input.parentId) {
    if (input.parentId === id) {
      return badRequest("A category can't be its own parent", {
        parentId: "Choose a different parent",
      });
    }
    if (existing._count.children > 0) {
      return badRequest(
        `"${existing.name}" has subcategories, so it can't become a subcategory itself.`,
        { parentId: "This category has subcategories of its own" },
      );
    }
    const parent = await prisma.category.findUnique({
      where: { id: input.parentId },
      include: { _count: { select: { products: true } } },
    });
    if (!parent) {
      return badRequest("That parent category no longer exists", {
        parentId: "Choose a parent",
      });
    }
    if (parent.parentId) {
      return badRequest("Categories only go two levels deep", {
        parentId: `"${parent.name}" is already a subcategory`,
      });
    }
    if (parent._count.products > 0) {
      return badRequest(
        `"${parent.name}" holds products directly, so it can't also have subcategories.`,
        { parentId: "This category already holds products" },
      );
    }
  } else if (existing.parentId && existing._count.products > 0) {
    // Promoting a subcategory that still holds products would leave those
    // products on a top-level node, where the storefront won't list them.
    return badRequest(
      `"${existing.name}" holds ${existing._count.products} product(s). Move them into a subcategory before making this a top-level category.`,
      { parentId: "Move its products first" },
    );
  }

  // slug is not regenerated — category URLs are linked and indexed.
  const category = await prisma.category.update({
    where: { id },
    data: {
      name: input.name,
      parentId: input.parentId,
      imageUrl: input.imageUrl,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
    },
  });

  return NextResponse.json(category);
}

export async function DELETE(_req: Request, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  const existing = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { children: true, products: true } } },
  });
  if (!existing) return notFound("Category not found");

  /*
   * Say exactly what's blocking, and refuse. The demo's UI promised the
   * products would simply become "uncategorized" while the database threw a
   * foreign-key error and the request 500'd.
   */
  if (existing._count.children > 0) {
    return conflict(
      `"${existing.name}" still has ${existing._count.children} subcategor${
        existing._count.children === 1 ? "y" : "ies"
      }. Delete or move those first.`,
    );
  }
  if (existing._count.products > 0) {
    return conflict(
      `"${existing.name}" still holds ${existing._count.products} product${
        existing._count.products === 1 ? "" : "s"
      }. Move them to another category first.`,
    );
  }

  await prisma.category.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
