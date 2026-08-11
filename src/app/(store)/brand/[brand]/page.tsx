import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { productCardSelect } from "@/lib/queries";
import { ProductGrid, EmptyState } from "@/components/ProductGrid";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const revalidate = 300;

type Props = { params: Promise<{ brand: string }> };

async function loadBrand(slug: string) {
  return prisma.brand.findFirst({
    where: { slug, isActive: true },
    select: { id: true, name: true, slug: true, logoUrl: true },
  });
}

export async function generateStaticParams() {
  const brands = await prisma.brand.findMany({
    where: { isActive: true, products: { some: {} } },
    select: { slug: true },
    take: 25,
  });
  return brands.map((b) => ({ brand: b.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { brand: slug } = await params;
  const brand = await loadBrand(slug);
  if (!brand) return {};

  return {
    title: brand.name,
    description: `${brand.name} products stocked at Shilpa — order on WhatsApp.`,
    alternates: { canonical: `/brand/${brand.slug}` },
  };
}

/**
 * Everything from one brand, grouped by top-level category. Each group links
 * to /brand/<brand>/<category>, which is the crawlable "Amul ice creams" page.
 */
export default async function BrandPage({ params }: Props) {
  const { brand: slug } = await params;
  const brand = await loadBrand(slug);
  if (!brand) notFound();

  const settings = await getSettings();

  const products = await prisma.product.findMany({
    where: { brandId: brand.id },
    select: {
      ...productCardSelect,
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
          parent: { select: { id: true, name: true, slug: true } },
        },
      },
    },
    orderBy: [{ inStock: "desc" }, { name: "asc" }],
  });

  // Group under the top-level category, so "Ice Cream" collects Tubs, Cones
  // and Kulfi into one section rather than three.
  const groups = new Map<
    string,
    { name: string; slug: string; items: typeof products }
  >();

  for (const product of products) {
    const top = product.category.parent ?? product.category;
    const group = groups.get(top.id);
    if (group) group.items.push(product);
    else groups.set(top.id, { name: top.name, slug: top.slug, items: [product] });
  }

  const sections = [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Brands", href: "/brands" },
          { label: brand.name },
        ]}
      />

      <header className="mb-8 flex items-center gap-4">
        {brand.logoUrl && (
          <div className="relative h-16 w-16 shrink-0 border border-border bg-surface">
            <Image
              src={brand.logoUrl}
              alt=""
              fill
              className="object-contain p-2"
              sizes="64px"
            />
          </div>
        )}
        <div>
          <h1 className="font-heading text-section text-ink">{brand.name}</h1>
          <p className="mt-1 text-caption text-ink-muted">
            {products.length} {products.length === 1 ? "product" : "products"} in the shop
          </p>
        </div>
      </header>

      {sections.length === 0 ? (
        <EmptyState
          title={`No ${brand.name} products listed yet.`}
          hint="Message the shop to ask whether they can order it in."
        >
          <Link href="/brands" className="btn-secondary">
            All brands
          </Link>
        </EmptyState>
      ) : (
        sections.map((section) => (
          <section key={section.slug} className="mb-12">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="font-heading text-section text-ink">{section.name}</h2>
              {section.items.length > 8 && (
                <Link
                  href={`/brand/${brand.slug}/${section.slug}`}
                  className="text-caption text-ink-muted hover:text-brand"
                >
                  View all {section.items.length}
                </Link>
              )}
            </div>
            <ProductGrid
              products={section.items.slice(0, 8)}
              whatsappNumber={settings.whatsappNumber}
              storeName={settings.storeName}
            />
          </section>
        ))
      )}
    </>
  );
}
