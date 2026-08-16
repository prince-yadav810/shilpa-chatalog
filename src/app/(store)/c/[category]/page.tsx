import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { brandsInCategories } from "@/lib/queries";
import { CategoryContinuousFeed } from "@/components/CategoryContinuousFeed";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { BrandFilterPills } from "@/components/BrandFilterPills";

import { ClientProductSection } from "@/components/ClientProductSection";


export const revalidate = 300;

type Props = {
  params: Promise<{ category: string }>;
};

/**
 * Lightweight category loader — fetches ONLY structure (no products).
 * Products are loaded client-side by ClientProductSection for instant page load.
 */
async function loadCategoryStructure(slug: string) {
  return prisma.category.findFirst({
    where: { slug, isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      imageUrl: true,
      parentId: true,
      parent: { select: { name: true, slug: true } },
      children: {
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          slug: true,
          imageUrl: true,
          // No products here — loaded client-side
        },
      },
    },
  });
}

export async function generateStaticParams() {
  const categories = await prisma.category.findMany({
    where: { parentId: null, isActive: true },
    select: { slug: true },
  });
  return categories.map((c) => ({ category: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category: slug } = await params;
  const category = await prisma.category.findFirst({
    where: { slug, isActive: true },
    select: { name: true, slug: true },
  });
  if (!category) return {};

  return {
    title: category.name,
    description: `Browse ${category.name} at Shilpa and order on WhatsApp.`,
    alternates: { canonical: `/c/${category.slug}` },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { category: slug } = await params;

  const category = await loadCategoryStructure(slug);
  if (!category) notFound();

  // Redirect subcategory if accessed via single segment URL
  if (category.parentId && category.parent) {
    redirect(`/c/${category.parent.slug}/${category.slug}`);
  }

  const settings = await getSettings();

  const childIds = category.children.map((c) => c.id);
  const categoryIds = childIds.length > 0 ? childIds : [category.id];
  const brands = await brandsInCategories(categoryIds);

  const hasChildren = category.children.length > 0;

  if (hasChildren) {
    return (
      <CategoryContinuousFeed
        parentCategory={{
          name: category.name,
          slug: category.slug,
          imageUrl: category.imageUrl,
        }}
        subcategories={category.children.map((child) => ({
          id: child.id,
          name: child.name,
          slug: child.slug,
          imageUrl: child.imageUrl,
        }))}
        brands={brands}
        whatsappNumber={settings.whatsappNumber}
        storeName={settings.storeName}
      />
    );
  }

  // Fallback for standalone leaf category — also uses client-side product loading
  return (
    <div className="py-2">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: category.name }]} />

      <header className="mb-4">
        <h1 className="font-heading text-lg font-bold text-ink sm:text-2xl">{category.name}</h1>
      </header>

      <BrandFilterPills brands={brands} categorySlug={category.slug} />

      <ClientProductSection
        categoryId={category.id}
        whatsappNumber={settings.whatsappNumber}
        storeName={settings.storeName}
      />
    </div>
  );
}
