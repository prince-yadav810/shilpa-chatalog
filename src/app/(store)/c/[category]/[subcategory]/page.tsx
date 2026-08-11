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
import { CategorySidebar } from "@/components/CategorySidebar";

export const revalidate = 300;

type Props = {
  params: Promise<{ category: string; subcategory: string }>;
  searchParams: Promise<{ page?: string }>;
};

async function loadSubcategory(parentSlug: string, slug: string) {
  const [current, parent] = await Promise.all([
    prisma.category.findFirst({
      where: { slug, isActive: true, parent: { slug: parentSlug, isActive: true } },
      select: {
        id: true,
        name: true,
        slug: true,
        imageUrl: true,
        parent: { select: { id: true, name: true, slug: true, imageUrl: true } },
      },
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
            _count: { select: { products: true } },
          },
        },
      },
    }),
  ]);

  if (!current || !parent) return null;
  return { current, parent };
}

export async function generateStaticParams() {
  const children = await prisma.category.findMany({
    where: { isActive: true, parent: { isNot: null } },
    select: { slug: true, parent: { select: { slug: true } } },
    take: 50,
  });
  return children
    .filter((c) => c.parent)
    .map((c) => ({ category: c.parent!.slug, subcategory: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, subcategory } = await params;
  const found = await loadSubcategory(category, subcategory);
  if (!found) return {};

  return {
    title: `${found.current.name} — ${found.parent.name}`,
    description: `Browse ${found.current.name} at Shilpa and order on WhatsApp.`,
    alternates: { canonical: `/c/${category}/${subcategory}` },
  };
}

export default async function SubcategoryPage({ params, searchParams }: Props) {
  const { category: parentSlug, subcategory: slug } = await params;
  const { page: pageParam } = await searchParams;
  const page = parsePage(pageParam);

  const found = await loadSubcategory(parentSlug, slug);
  if (!found) notFound();

  const { current, parent } = found;
  const settings = await getSettings();

  const [{ products, total, totalPages }, brands] = await Promise.all([
    listProducts({ categoryId: current.id }, page),
    brandsInCategories([current.id]),
  ]);

  const basePath = `/c/${parent.slug}/${current.slug}`;

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Quick-Commerce Left Vertical Sidebar */}
      <CategorySidebar
        parentCategory={{
          name: parent.name,
          slug: parent.slug,
          imageUrl: parent.imageUrl,
        }}
        subcategories={parent.children.map((child) => ({
          id: child.id,
          name: child.name,
          slug: child.slug,
          imageUrl: child.imageUrl,
          productCount: child._count.products,
        }))}
        activeSubcategorySlug={current.slug}
      />

      {/* Main Right Content Section */}
      <main className="flex-1 p-3 sm:p-5 min-w-0">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: parent.name, href: `/c/${parent.slug}` },
            { label: current.name },
          ]}
        />

        <header className="mb-4">
          <h1 className="font-heading text-lg font-bold text-ink sm:text-2xl">{current.name}</h1>
          <p className="mt-0.5 text-xs text-ink-muted">
            {total} {total === 1 ? "item" : "items"} in {current.name}
          </p>
        </header>

        <BrandFilterPills brands={brands} categorySlug={current.slug} />

        {products.length === 0 ? (
          <EmptyState
            title={`Nothing in ${current.name} yet.`}
            hint="Try the rest of the category, or message the shop to ask what's in stock."
          >
            <Link href={`/c/${parent.slug}`} className="btn-secondary">
              All {parent.name}
            </Link>
          </EmptyState>
        ) : (
          <>
            <ProductGrid
              products={products}
              whatsappNumber={settings.whatsappNumber}
              storeName={settings.storeName}
            />
            <Pagination page={page} totalPages={totalPages} basePath={basePath} />
          </>
        )}
      </main>
    </div>
  );
}
