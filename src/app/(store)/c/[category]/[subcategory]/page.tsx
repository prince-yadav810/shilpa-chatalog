import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { listProducts, parsePage } from "@/lib/queries";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ProductGrid, EmptyState } from "@/components/ProductGrid";
import { Pagination } from "@/components/Pagination";
import Link from "next/link";

export const revalidate = 300;

type Props = {
  params: Promise<{ category: string; subcategory: string }>;
  searchParams: Promise<{ page?: string }>;
};

async function loadCategory(parentSlug: string, subSlug: string) {
  return prisma.category.findFirst({
    where: { slug: subSlug, isActive: true, parent: { slug: parentSlug, isActive: true } },
    select: {
      id: true,
      name: true,
      slug: true,
      parent: { select: { name: true, slug: true } }
    },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, subcategory } = await params;
  const found = await loadCategory(category, subcategory);
  if (!found || !found.parent) return {};

  return {
    title: `${found.name} — ${found.parent.name}`,
    description: `Browse ${found.name} at Shilpa and order on WhatsApp.`,
    alternates: { canonical: `/c/${category}/${subcategory}` },
  };
}

export default async function SubcategoryPage({ params, searchParams }: Props) {
  const { category: parentSlug, subcategory: slug } = await params;
  const { page: pageParam } = await searchParams;
  const page = parsePage(pageParam);

  const category = await loadCategory(parentSlug, slug);
  if (!category || !category.parent) notFound();

  const settings = await getSettings();

  const { products, total, totalPages } = await listProducts(
    { categoryId: category.id },
    page
  );

  return (
    <div className="py-2">
      <Breadcrumbs 
        items={[
          { label: "Home", href: "/" },
          { label: category.parent.name, href: `/c/${category.parent.slug}` },
          { label: category.name }
        ]} 
      />

      <header className="mb-4">
        <h1 className="font-heading text-lg font-bold text-ink sm:text-2xl">{category.name}</h1>
        <p className="mt-0.5 text-xs text-ink-muted">
          {total} {total === 1 ? "item" : "items"} in {category.name}
        </p>
      </header>

      {products.length === 0 ? (
        <EmptyState
          title={`Nothing in ${category.name} yet.`}
          hint="This section is still being stocked. Try another category, or message the shop to ask."
        >
          <Link href={`/c/${category.parent.slug}`} className="btn-secondary">
            Back to {category.parent.name}
          </Link>
        </EmptyState>
      ) : (
        <>
          <ProductGrid
            products={products}
            whatsappNumber={settings.whatsappNumber}
            storeName={settings.storeName}
          />
          <Pagination 
            page={page} 
            totalPages={totalPages} 
            basePath={`/c/${category.parent.slug}/${category.slug}`} 
          />
        </>
      )}
    </div>
  );
}
