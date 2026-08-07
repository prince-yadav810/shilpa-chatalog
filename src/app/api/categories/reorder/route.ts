import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { parseBody } from "@/lib/api";
import { reorderSchema } from "@/lib/validation";

export const runtime = "nodejs";

/** Writes sortOrder for a set of categories in one transaction. */
export async function PUT(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = await parseBody(req, reorderSchema);
  if (!parsed.ok) return parsed.response;

  await prisma.$transaction(
    parsed.data.items.map((item) =>
      prisma.category.update({
        where: { id: item.id },
        data: { sortOrder: item.sortOrder },
      }),
    ),
  );

  return NextResponse.json({ ok: true });
}
