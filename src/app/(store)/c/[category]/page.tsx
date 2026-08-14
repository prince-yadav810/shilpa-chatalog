import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { brandsInCategories, productCardSelect } from "@/lib/queries";
import { CategoryContinuousFeed } from "@/components/CategoryContinuousFeed";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { BrandFilterPills } from "@/components/BrandFilterPills";
import { ProductGrid, EmptyState } from "@/components/ProductGrid";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 300;

type Props = {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ brand?: string }>;
};

async function loadCategoryWithSubcategories(slug: string) {
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
          products: {
            where: { isArchived: false },
            select: productCardSelect,
            orderBy: [{ inStock: "desc" }, { name: "asc" }],
          },
        },
      },
      products: {
        where: { isArchived: false },
        select: productCardSelect,
        orderBy: [{ inStock: "desc" }, { name: "asc" }],
      },
    },
  });
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

  const category = await loadCategoryWithSubcategories(slug);
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
    const totalProducts = category.children.reduce(
      (sum, child) => sum + child.products.length,
      0
    );

    return (
      <CategoryContinuousFeed
        parentCategory={{
          name: category.name,
          slug: category.slug,
          imageUrl: category.imageUrl,
          totalProducts,
        }}
        subcategories={category.children.map((child) => ({
          id: child.id,
          name: child.name,
          slug: child.slug,
          imageUrl: child.imageUrl,
          products: child.products,
        }))}
        brands={brands}
        whatsappNumber={settings.whatsappNumber}
        storeName={settings.storeName}
      />
    );
  }

  // Fallback for standalone leaf category with direct products
  return (
    <div className="py-2">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: category.name }]} />

      <header className="mb-4">
        <h1 className="font-heading text-lg font-bold text-ink sm:text-2xl">{category.name}</h1>
        <p className="mt-0.5 text-xs text-ink-muted">
          {category.products.length}{" "}
          {category.products.length === 1 ? "item" : "items"} in {category.name}
        </p>
      </header>

      <BrandFilterPills brands={brands} categorySlug={category.slug} />

      {category.products.length === 0 ? (
        <EmptyState
          title={`Nothing in ${category.name} yet.`}
          hint="This section is still being stocked. Try another category, or message the shop to ask."
        >
          <Link href="/" className="btn-secondary">
            Back to all categories
          </Link>
        </EmptyState>
      ) : (
        <ProductGrid
          products={category.products}
          whatsappNumber={settings.whatsappNumber}
          storeName={settings.storeName}
        />
      )}
    </div>
  );
}
