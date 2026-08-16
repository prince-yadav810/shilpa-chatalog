import { cache } from "react";
import { unstable_cache } from "next/cache";
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
 * Fetch settings from DB — called at most once per serverless invocation
 * thanks to React `cache()`, and cached for 5 minutes across invocations
 * via Next.js `unstable_cache` (Vercel Data Cache / in-memory LRU).
 *
 * This eliminates one DB round-trip per page render across every store page,
 * which is critical on Supabase free tier where connection slots are scarce.
 * The cache is revalidated when the admin settings page calls the /api/settings
 * endpoint (which should call revalidateTag("site-settings")).
 */
const fetchSettings = unstable_cache(
  async (): Promise<SiteSettingsView> => {
    try {
      const row = await prisma.siteSettings.findUnique({ where: { id: "default" } });
      if (!row) return FALLBACK;
      return {
        storeName: row.storeName,
        whatsappNumber: row.whatsappNumber,
        promoBannerText: row.promoBannerText,
        promoBannerLink: row.promoBannerLink,
      };
    } catch {
      // DB connection issue — return fallback so pages still render.
      return FALLBACK;
    }
  },
  ["site-settings"],
  { revalidate: 300, tags: ["site-settings"] } // 5-minute TTL
);

/**
 * Per-request dedup wrapper: if two components in the same render call
 * getSettings(), only one actual cache lookup happens.
 */
export const getSettings = cache(fetchSettings);
