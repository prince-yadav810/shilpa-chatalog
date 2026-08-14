import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { brandsInCategories, productCardSelect } from "@/lib/queries";
import { CategoryContinuousFeed } from "@/components/CategoryContinuousFeed";

export const dynamic = "force-dynamic";
export const revalidate = 300;

type Props = {
  params: Promise<{ category: string; subcategory: string }>;
};

async function loadCategoryHierarchy(parentSlug: string, subSlug: string) {
  const [current, parent] = await Promise.all([
    prisma.category.findFirst({
      where: { slug: subSlug, isActive: true, parent: { slug: parentSlug, isActive: true } },
      select: { id: true, name: true, slug: true },
    }),
    prisma.category.findFirst({
      where: { slug: parentSlug, isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        imageUrl: true,
        children: {
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          select: {
            id: true,
            name: true,
            slug: true,
            imageUrl: true,
            products: {
              where: { isArchived: false },
              select: productCardSelect,
              orderBy: [{ inStock: "desc" }, { name: "asc" }],
            },
          },
        },
      },
    }),
  ]);

  if (!current || !parent) return null;
  return { current, parent };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, subcategory } = await params;
  const found = await loadCategoryHierarchy(category, subcategory);
  if (!found) return {};

  return {
    title: `${found.current.name} — ${found.parent.name}`,
    description: `Browse ${found.current.name} at Shilpa and order on WhatsApp.`,
    alternates: { canonical: `/c/${category}/${subcategory}` },
  };
}

export default async function SubcategoryPage({ params }: Props) {
  const { category: parentSlug, subcategory: slug } = await params;

  const found = await loadCategoryHierarchy(parentSlug, slug);
  if (!found) notFound();

  const { current, parent } = found;
  const settings = await getSettings();

  const childIds = parent.children.map((c) => c.id);
  const brands = await brandsInCategories(childIds);

  const totalProducts = parent.children.reduce(
    (sum, child) => sum + child.products.length,
    0
  );

  return (
    <CategoryContinuousFeed
      parentCategory={{
        name: parent.name,
        slug: parent.slug,
        imageUrl: parent.imageUrl,
        totalProducts,
      }}
      subcategories={parent.children.map((child) => ({
        id: child.id,
        name: child.name,
        slug: child.slug,
        imageUrl: child.imageUrl,
        products: child.products,
      }))}
      brands={brands}
      initialSubcategorySlug={current.slug}
      whatsappNumber={settings.whatsappNumber}
      storeName={settings.storeName}
    />
  );
}
