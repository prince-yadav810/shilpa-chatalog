import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { badRequest, notFound, parseBody } from "@/lib/api";
import { brandInputSchema } from "@/lib/validation";

export const runtime = "nodejs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function getCloudinaryPublicId(url: string | null | undefined): string | null {
  if (!url || !url.includes("res.cloudinary.com")) return null;
  try {
    const parts = url.split("/upload/");
    if (parts.length < 2) return null;
    let path = parts[1];
    path = path.replace(/^v\d+\//, "");
    const lastDot = path.lastIndexOf(".");
    if (lastDot !== -1) path = path.substring(0, lastDot);
    return path;
  } catch {
    return null;
  }
}

async function safeDestroyCloudinary(url: string | null | undefined) {
  const publicId = getCloudinaryPublicId(url);
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch {}
}

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
    include: {
      products: { select: { id: true, imageUrl: true } },
    },
  });
  if (!existing) return notFound("Brand not found");

  // 1. Destroy Cloudinary image for brand logo
  if (existing.logoUrl) {
    await safeDestroyCloudinary(existing.logoUrl);
  }

  // 2. Destroy Cloudinary images for all products belonging to this brand
  for (const product of existing.products) {
    if (product.imageUrl) {
      await safeDestroyCloudinary(product.imageUrl);
    }
  }

  // 3. Delete all products belonging to this brand
  await prisma.product.deleteMany({ where: { brandId: id } });

  // 4. Delete brand record
  await prisma.brand.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
