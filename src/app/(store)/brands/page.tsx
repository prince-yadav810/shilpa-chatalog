import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/ProductGrid";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const dynamic = "force-dynamic";
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Brands",
  description: "Every brand stocked at Shilpa.",
  alternates: { canonical: "/brands" },
};

export default async function BrandsPage() {
  const brands = await prisma.brand.findMany({
    where: { isActive: true, products: { some: {} } },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      _count: { select: { products: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Brands" }]} />

      <header className="mb-6">
        <h1 className="font-heading text-section text-ink">Brands</h1>
        <p className="mt-1 text-caption text-ink-muted">
          {brands.length} {brands.length === 1 ? "brand" : "brands"} in the shop
        </p>
      </header>

      {brands.length === 0 ? (
        <EmptyState
          title="No brands listed yet."
          hint="Brands appear here once products are added to the catalog."
        />
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {brands.map((brand) => (
            <li key={brand.id}>
              <Link
                href={`/brand/${brand.slug}`}
                className="flex h-full flex-col border border-border bg-surface transition-colors hover:border-brand/40"
              >
                <div className="relative flex aspect-[3/2] items-center justify-center bg-background">
                  {brand.logoUrl ? (
                    <Image
                      src={brand.logoUrl}
                      alt=""
                      fill
                      className="object-contain p-5"
                      sizes="(max-width: 640px) 50vw, 25vw"
                    />
                  ) : (
                    <span className="font-heading text-lg text-border">{brand.name}</span>
                  )}
                </div>
                <div className="flex items-baseline justify-between p-3">
                  <span className="text-body font-medium text-ink">{brand.name}</span>
                  <span className="price text-caption text-ink-muted">
                    {brand._count.products}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
