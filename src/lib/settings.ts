import { cache } from "react";
import { prisma } from "@/lib/prisma";

export type SiteSettingsView = {
  storeName: string;
  whatsappNumber: string;
  promoBannerText: string | null;
  promoBannerLink: string | null;
};

const FALLBACK: SiteSettingsView = {
  storeName: "Shilpa",
  whatsappNumber: "",
  promoBannerText: null,
  promoBannerLink: null,
};

/**
 * Read once per request (React `cache` dedupes across the component tree).
 *
 * Settings live in the database rather than a NEXT_PUBLIC_ env var on purpose:
 * those are inlined at build time, so changing the shop's WhatsApp number
 * would otherwise need a redeploy.
 */
export const getSettings = cache(async (): Promise<SiteSettingsView> => {
  const row = await prisma.siteSettings.findUnique({ where: { id: "default" } });
  if (!row) return FALLBACK;
  return {
    storeName: row.storeName,
    whatsappNumber: row.whatsappNumber,
    promoBannerText: row.promoBannerText,
    promoBannerLink: row.promoBannerLink,
  };
});
