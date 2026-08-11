import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { listProducts, parsePage } from "@/lib/queries";
import { ProductGrid, EmptyState } from "@/components/ProductGrid";
import { Pagination } from "@/components/Pagination";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const revalidate = 300;

type Props = {
  params: Promise<{ brand: string; category: string }>;
  searchParams: Promise<{ page?: string }>;
};

async function load(brandSlug: string, categorySlug: string) {
  const [brand, category] = await Promise.all([
    prisma.brand.findFirst({
      where: { slug: brandSlug, isActive: true },
      select: { id: true, name: true, slug: true },
    }),
    prisma.category.findFirst({
      where: { slug: categorySlug, isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        parent: { select: { name: true, slug: true } },
        children: { where: { isActive: true }, select: { id: true } },
      },
    }),
  ]);

  if (!brand || !category) return null;

  const categoryIds =
    category.children.length > 0 ? category.children.map((c) => c.id) : [category.id];

  return { brand, category, categoryIds };
}

/**
 * Only pairs that actually have products get pre-rendered — otherwise every
 * brand × every category would emit a page, most of them empty.
 */
export async function generateStaticParams() {
  const pairs = await prisma.product.findMany({
    where: { brandId: { not: null } },
    distinct: ["brandId", "categoryId"],
    select: {
      brand: { select: { slug: true } },
      category: {
        select: { slug: true, parent: { select: { slug: true } } },
      },
    },
    take: 50,
  });

  const seen = new Set<string>();
  const params: { brand: string; category: string }[] = [];

  for (const pair of pairs) {
    if (!pair.brand) continue;
    // Register both the leaf and its parent — /brand/amul/ice-cream should
    // work as well as /brand/amul/tubs.
    for (const slug of [pair.category.slug, pair.category.parent?.slug]) {
      if (!slug) continue;
      const key = `${pair.brand.slug}/${slug}`;
      if (seen.has(key)) continue;
      seen.add(key);
      params.push({ brand: pair.brand.slug, category: slug });
    }
  }

  return params;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { brand: brandSlug, category: categorySlug } = await params;
  const found = await load(brandSlug, categorySlug);
  if (!found) return {};

  const title = `${found.brand.name} ${found.category.name}`;
  return {
    title,
    description: `${title} stocked at Shilpa — browse the range and order on WhatsApp.`,
    alternates: { canonical: `/brand/${found.brand.slug}/${found.category.slug}` },
  };
}

export default async function BrandCategoryPage({ params, searchParams }: Props) {
  const { brand: brandSlug, category: categorySlug } = await params;
  const { page: pageParam } = await searchParams;
  const page = parsePage(pageParam);

  const found = await load(brandSlug, categorySlug);
  if (!found) notFound();

  const { brand, category, categoryIds } = found;
  const settings = await getSettings();

  const { products, total, totalPages } = await listProducts(
    { brandId: brand.id, categoryId: { in: categoryIds } },
    page,
  );

  // A pair with nothing in it isn't a real page — don't leave a hollow URL
  // sitting in the index.
  if (total === 0) notFound();

  const categoryHref = category.parent
    ? `/c/${category.parent.slug}/${category.slug}`
    : `/c/${category.slug}`;

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Brands", href: "/brands" },
          { label: brand.name, href: `/brand/${brand.slug}` },
          { label: category.name },
        ]}
      />

      <header className="mb-6">
        <h1 className="font-heading text-section text-ink">
          {brand.name} {category.name}
        </h1>
        <p className="mt-1 text-caption text-ink-muted">
          {total} {total === 1 ? "product" : "products"} ·{" "}
          <Link href={categoryHref} className="hover:text-brand">
            all {category.name}
          </Link>{" "}
          ·{" "}
          <Link href={`/brand/${brand.slug}`} className="hover:text-brand">
            all {brand.name}
          </Link>
        </p>
      </header>

      {products.length === 0 ? (
        <EmptyState title={`No ${brand.name} ${category.name} on this page.`} />
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
            basePath={`/brand/${brand.slug}/${category.slug}`}
          />
        </>
      )}
    </>
  );
}
