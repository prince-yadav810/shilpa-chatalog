import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { badRequest, parseBody } from "@/lib/api";
import { categoryInputSchema } from "@/lib/validation";
import { uniqueSlug } from "@/lib/slug";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = await parseBody(req, categoryInputSchema);
  if (!parsed.ok) return parsed.response;
  const input = parsed.data;

  if (input.parentId) {
    const parent = await prisma.category.findUnique({
      where: { id: input.parentId },
      include: { _count: { select: { products: true } } },
    });
    if (!parent) {
      return badRequest("That parent category no longer exists", {
        parentId: "Choose a parent",
      });
    }
    // Two levels only. A grandchild would make the admin's "where does this
    // go" decision harder and the breadcrumb longer for no real gain.
    if (parent.parentId) {
      return badRequest("Categories only go two levels deep", {
        parentId: `"${parent.name}" is already a subcategory`,
      });
    }
    if (parent._count.products > 0) {
      return badRequest(
        `"${parent.name}" holds products directly, so it can't also have subcategories. Move its products into a subcategory first.`,
        { parentId: "This category already holds products" },
      );
    }
  }

  const category = await prisma.category.create({
    data: { ...input, slug: await uniqueSlug("category", input.name) },
  });

  return NextResponse.json(category, { status: 201 });
}
