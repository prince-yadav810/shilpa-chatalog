import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { brandsInCategories, listProducts, parsePage } from "@/lib/queries";
import { ProductGrid, EmptyState } from "@/components/ProductGrid";
import { Pagination } from "@/components/Pagination";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { BrandFilterPills } from "@/components/BrandFilterPills";

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
      parentId: true,
      parent: { select: { name: true, slug: true } },
      children: {
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { id: true, name: true, slug: true, _count: { select: { products: true } } },
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

  // A subcategory reached at /c/<slug> belongs under its parent — send it to
  // the canonical two-segment URL rather than serving the same page twice.
  if (category.parentId && category.parent) {
    const { redirect } = await import("next/navigation");
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
    <>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: category.name }]} />

      <header className="mb-6">
        <h1 className="font-heading text-section text-ink">{category.name}</h1>
        <p className="mt-1 text-caption text-ink-muted">
          {total} {total === 1 ? "product" : "products"}
        </p>
      </header>

      {category.children.length > 0 && (
        <nav aria-label="Subcategories" className="mb-6">
          <ul className="flex flex-wrap gap-2">
            {category.children.map((child) => (
              <li key={child.id}>
                <Link
                  href={`/c/${category.slug}/${child.slug}`}
                  className="block border border-border bg-surface px-3 py-1.5 text-caption text-ink hover:border-brand/40 hover:text-brand"
                >
                  {child.name}{" "}
                  <span className="price text-ink-muted">{child._count.products}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

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
    </>
  );
}
