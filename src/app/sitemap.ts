import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export const revalidate = 3600;

const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, brands, products, brandCategoryPairs] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true },
      select: {
        slug: true,
        updatedAt: true,
        parent: { select: { slug: true } },
      },
    }),
    prisma.brand.findMany({
      where: { isActive: true, products: { some: {} } },
      select: { slug: true, updatedAt: true },
    }),
    prisma.product.findMany({ select: { slug: true, updatedAt: true } }),
    prisma.product.findMany({
      where: { brandId: { not: null } },
      distinct: ["brandId", "categoryId"],
      select: {
        brand: { select: { slug: true } },
        category: { select: { slug: true, parent: { select: { slug: true } } } },
      },
    }),
  ]);

  const entries: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/brands`, changeFrequency: "weekly", priority: 0.6 },
  ];

  for (const category of categories) {
    entries.push({
      url: category.parent
        ? `${base}/c/${category.parent.slug}/${category.slug}`
        : `${base}/c/${category.slug}`,
      lastModified: category.updatedAt,
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  for (const brand of brands) {
    entries.push({
      url: `${base}/brand/${brand.slug}`,
      lastModified: brand.updatedAt,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  // Only brand × category pairs that actually hold products — the page 404s
  // when empty, so listing them all would fill the sitemap with dead URLs.
  const seen = new Set<string>();
  for (const pair of brandCategoryPairs) {
    if (!pair.brand) continue;
    for (const slug of [pair.category.slug, pair.category.parent?.slug]) {
      if (!slug) continue;
      const key = `${pair.brand.slug}/${slug}`;
      if (seen.has(key)) continue;
      seen.add(key);
      entries.push({
        url: `${base}/brand/${key}`,
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  }

  for (const product of products) {
    entries.push({
      url: `${base}/product/${product.slug}`,
      lastModified: product.updatedAt,
      changeFrequency: "weekly",
      priority: 0.9,
    });
  }

  return entries;
}
