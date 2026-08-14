import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { badRequest, notFound, parseBody } from "@/lib/api";
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

export async function DELETE(req: Request, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  const existing = await prisma.brand.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });
  if (!existing) return notFound("Brand not found");

  const url = new URL(req.url);
  const cascade = url.searchParams.get("cascade") === "true";

  if (cascade) {
    await prisma.product.deleteMany({ where: { brandId: id } });
  } else {
    await prisma.product.updateMany({
      where: { brandId: id },
      data: { brandId: null },
    });
  }

  await prisma.brand.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
