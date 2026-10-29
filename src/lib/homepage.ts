import { HomepageSection } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { productCardSelect } from "@/lib/queries";

export const homepageSections = {
  popularCategories: HomepageSection.POPULAR_CATEGORIES,
  popularProducts: HomepageSection.POPULAR_PRODUCTS,
  topOffers: HomepageSection.TOP_OFFERS,
  brands: HomepageSection.BRANDS,
} as const;

export type HomepageSectionKey = keyof typeof homepageSections;

export const homepageSectionKeys = Object.keys(homepageSections) as HomepageSectionKey[];

export function getHomepageSection(value: string | null | undefined): HomepageSection | null {
  if (!value || !homepageSectionKeys.includes(value as HomepageSectionKey)) return null;
  return homepageSections[value as HomepageSectionKey];
}
const itemInclude = {
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
      imageUrl: true,
      isActive: true,
      parent: { select: { id: true, name: true, slug: true, isActive: true } },
    },
  },
  product: { select: { ...productCardSelect, isArchived: true } },
  brand: {
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      isActive: true,
      products: {
        where: { isArchived: false },
        select: { id: true },
        take: 1,
      },
    },
  },
};

/**
 * Fetch the four small, manually curated shelves once. Every returned list is
 * already in the exact sequence chosen in Admin → Homepage.
 */
export async function getHomepageSelections() {
  const items = await prisma.homepageItem.findMany({
    orderBy: [{ section: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
    include: itemInclude,
  });

  return {
    popularCategories: items.flatMap((item) => {
      if (item.section !== HomepageSection.POPULAR_CATEGORIES) return [];
      const category = item.category;
      if (!category?.isActive || !category.parent?.isActive) return [];
      return [
        {
          id: category.id,
          name: category.name,
          slug: category.slug,
          imageUrl: category.imageUrl,
          parentName: category.parent.name,
          parentSlug: category.parent.slug,
        },
      ];
    }),
    popularProducts: items.flatMap((item) => {
      if (item.section !== HomepageSection.POPULAR_PRODUCTS) return [];
      const product = item.product;
      return product && !product.isArchived && product.inStock ? [product] : [];
    }),
    topOffers: items.flatMap((item) => {
      if (item.section !== HomepageSection.TOP_OFFERS) return [];
      const product = item.product;
      return product && !product.isArchived && product.inStock && product.mrp != null && product.mrp > product.price
        ? [product]
        : [];
    }),
    brands: items.flatMap((item) => {
      if (item.section !== HomepageSection.BRANDS) return [];
      const brand = item.brand;
      return brand && brand.isActive && brand.products.length > 0
        ? [{ id: brand.id, name: brand.name, slug: brand.slug, logoUrl: brand.logoUrl }]
        : [];
    }),
  };
}
