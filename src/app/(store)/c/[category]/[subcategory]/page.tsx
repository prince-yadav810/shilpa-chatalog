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
  params: Promise<{ category: string; subcategory: string }>;
  searchParams: Promise<{ page?: string }>;
};

async function loadSubcategory(parentSlug: string, slug: string) {
  return prisma.category.findFirst({
    where: { slug, isActive: true, parent: { slug: parentSlug, isActive: true } },
    select: {
      id: true,
      name: true,
      slug: true,
      parent: { select: { name: true, slug: true } },
    },
  });
}

export async function generateStaticParams() {
  const children = await prisma.category.findMany({
    where: { isActive: true, parent: { isNot: null } },
    select: { slug: true, parent: { select: { slug: true } } },
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
    title: `${found.name} — ${found.parent?.name ?? ""}`.trim(),
    description: `Browse ${found.name} at Shilpa and order on WhatsApp.`,
    alternates: { canonical: `/c/${category}/${subcategory}` },
  };
}

export default async function SubcategoryPage({ params, searchParams }: Props) {
  const { category: parentSlug, subcategory: slug } = await params;
  const { page: pageParam } = await searchParams;
  const page = parsePage(pageParam);

  const category = await loadSubcategory(parentSlug, slug);
  if (!category || !category.parent) notFound();

  const settings = await getSettings();

  const [{ products, total, totalPages }, brands] = await Promise.all([
    listProducts({ categoryId: category.id }, page),
    brandsInCategories([category.id]),
  ]);

  const basePath = `/c/${category.parent.slug}/${category.slug}`;

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: category.parent.name, href: `/c/${category.parent.slug}` },
          { label: category.name },
        ]}
      />

      <header className="mb-6">
        <h1 className="font-heading text-section text-ink">{category.name}</h1>
        <p className="mt-1 text-caption text-ink-muted">
          {total} {total === 1 ? "product" : "products"} in {category.parent.name}
        </p>
      </header>

      <BrandFilterPills brands={brands} categorySlug={category.slug} />

      {products.length === 0 ? (
        <EmptyState
          title={`Nothing in ${category.name} yet.`}
          hint="Try the rest of the category, or message the shop to ask what's in stock."
        >
          <Link href={`/c/${category.parent.slug}`} className="btn-secondary">
            All {category.parent.name}
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
    </>
  );
}
