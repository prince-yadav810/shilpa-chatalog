import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { badRequest, parseBody } from "@/lib/api";
import { brandInputSchema } from "@/lib/validation";
import { uniqueSlug } from "@/lib/slug";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = await parseBody(req, brandInputSchema);
  if (!parsed.ok) return parsed.response;
  const input = parsed.data;

  // Case-insensitive duplicate check — "Amul" and "amul" are one brand.
  const clash = await prisma.brand.findFirst({
    where: { name: { equals: input.name, mode: "insensitive" } },
  });
  if (clash) {
    return badRequest("That brand already exists", {
      name: `"${clash.name}" is already in the list`,
    });
  }

  const brand = await prisma.brand.create({
    data: { ...input, slug: await uniqueSlug("brand", input.name) },
  });

  return NextResponse.json(brand, { status: 201 });
}
