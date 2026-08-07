import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { badRequest, conflict, notFound, parseBody } from "@/lib/api";
import { brandInputSchema } from "@/lib/validation";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  const existing = await prisma.brand.findUnique({ where: { id } });
  if (!existing) return notFound("Brand not found");

  const parsed = await parseBody(req, brandInputSchema);
  if (!parsed.ok) return parsed.response;
  const input = parsed.data;

  const clash = await prisma.brand.findFirst({
    where: { name: { equals: input.name, mode: "insensitive" }, NOT: { id } },
  });
  if (clash) {
    return badRequest("That brand already exists", {
      name: `"${clash.name}" is already in the list`,
    });
  }

  // slug stays put — /brand/<slug> pages are linked and indexed.
  const brand = await prisma.brand.update({ where: { id }, data: input });
  return NextResponse.json(brand);
}

export async function DELETE(_req: Request, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  const existing = await prisma.brand.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });
  if (!existing) return notFound("Brand not found");

  if (existing._count.products > 0) {
    return conflict(
      `"${existing.name}" is used by ${existing._count.products} product${
        existing._count.products === 1 ? "" : "s"
      }. Change their brand first.`,
    );
  }

  await prisma.brand.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
