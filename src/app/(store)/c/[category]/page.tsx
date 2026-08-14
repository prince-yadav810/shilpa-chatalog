import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { brandsInCategories, listProducts, parsePage } from "@/lib/queries";
import { ProductGrid, EmptyState } from "@/components/ProductGrid";
import { Pagination } from "@/components/Pagination";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { BrandFilterPills } from "@/components/BrandFilterPills";
import { CategorySidebar } from "@/components/CategorySidebar";

export const dynamic = "force-dynamic";
export const revalidate = 300;

type Props = {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ page?: string }>;
};

async function loadCategory(slug: string) {
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
          _count: { select: { products: true } },
        },
      },
    },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category: slug } = await params;
  const category = await loadCategory(slug);
  if (!category) return {};

  return {
    title: category.name,
    description: `Browse ${category.name} at Shilpa and order on WhatsApp.`,
    alternates: { canonical: `/c/${category.slug}` },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { category: slug } = await params;
  const { page: pageParam } = await searchParams;
  const page = parsePage(pageParam);

  const category = await loadCategory(slug);
  if (!category) notFound();

  // Redirect subcategory if accessed via single segment URL
  if (category.parentId && category.parent) {
    redirect(`/c/${category.parent.slug}/${category.slug}`);
  }

  const settings = await getSettings();

  const childIds = category.children.map((c) => c.id);
  const categoryIds = childIds.length > 0 ? childIds : [category.id];

  const [{ products, total, totalPages }, brands] = await Promise.all([
    listProducts({ categoryId: { in: categoryIds } }, page),
    brandsInCategories(categoryIds),
  ]);

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Quick-Commerce Left Vertical Sidebar for Subcategories */}
      {category.children.length > 0 && (
        <CategorySidebar
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
            productCount: child._count.products,
          }))}
        />
      )}

      {/* Main Right Content Section */}
      <main className="flex-1 p-3 sm:p-5 min-w-0">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: category.name }]} />

        <header className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h1 className="font-heading text-lg font-bold text-ink sm:text-2xl">{category.name}</h1>
            <p className="mt-0.5 text-xs text-ink-muted">
              {total} {total === 1 ? "item" : "items"} in {category.name}
            </p>
          </div>
        </header>

        <BrandFilterPills brands={brands} categorySlug={category.slug} />

        {products.length === 0 ? (
          <EmptyState
            title={`Nothing in ${category.name} yet.`}
            hint="This section is still being stocked. Try another category, or message the shop to ask."
          >
            <Link href="/" className="btn-secondary">
              Back to all categories
            </Link>
          </EmptyState>
        ) : (
          <>
            <ProductGrid
              products={products}
              whatsappNumber={settings.whatsappNumber}
              storeName={settings.storeName}
            />
            <Pagination page={page} totalPages={totalPages} basePath={`/c/${category.slug}`} />
          </>
        )}
      </main>
    </div>
  );
}
