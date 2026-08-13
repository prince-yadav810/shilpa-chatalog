import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const { id } = await params;
  let body: { discountPercent?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const discountPercent = Number(body.discountPercent);
  if (isNaN(discountPercent) || discountPercent < 0 || discountPercent > 99) {
    return NextResponse.json(
      { error: "Discount percentage must be a number between 0 and 99" },
      { status: 400 }
    );
  }

  const brand = await prisma.brand.findUnique({ where: { id } });
  if (!brand) {
    return NextResponse.json({ error: "Brand not found" }, { status: 404 });
  }

  const products = await prisma.product.findMany({
    where: { brandId: id },
    select: { id: true, price: true, mrp: true }
  });

  if (products.length === 0) {
    return NextResponse.json({ ok: true, count: 0, message: "No products found for this brand" });
  }

  let updatedCount = 0;
  for (const p of products) {
    const baseMrp = p.mrp && p.mrp > p.price ? p.mrp : p.price;
    const newPrice = Math.max(1, Math.round(baseMrp * (1 - discountPercent / 100)));

    await prisma.product.update({
      where: { id: p.id },
      data: {
        mrp: baseMrp,
        price: newPrice
      }
    });
    updatedCount++;
  }

  return NextResponse.json({
    ok: true,
    count: updatedCount,
    message: `Applied ${discountPercent}% discount to ${updatedCount} products!`
  });
}
