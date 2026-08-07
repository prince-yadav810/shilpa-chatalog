import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { parseBody } from "@/lib/api";
import { settingsInputSchema } from "@/lib/validation";
import { normaliseNumber } from "@/lib/whatsapp";

export const runtime = "nodejs";

export async function PUT(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = await parseBody(req, settingsInputSchema);
  if (!parsed.ok) return parsed.response;
  const input = parsed.data;

  const data = {
    storeName: input.storeName,
    whatsappNumber: normaliseNumber(input.whatsappNumber),
    promoBannerText: input.promoBannerText,
    promoBannerLink: input.promoBannerLink,
  };

  const settings = await prisma.siteSettings.upsert({
    where: { id: "default" },
    update: data,
    create: { id: "default", ...data },
  });

  // Every storefront page renders the WhatsApp number, so the whole site is
  // stale after this. This is what lets the number change without a redeploy.
  revalidatePath("/", "layout");

  return NextResponse.json(settings);
}
