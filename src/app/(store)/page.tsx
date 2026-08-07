import Image from "next/image";
import Link from "next/link";
import { Package } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { productCardSelect } from "@/lib/queries";
import { ProductGrid, EmptyState } from "@/components/ProductGrid";

export const revalidate = 300;

export default async function HomePage() {
  const [settings, categories, featured, brands] = await Promise.all([
    getSettings(),
    prisma.category.findMany({
      where: { parentId: null, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        imageUrl: true,
        children: {
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          select: { name: true, slug: true },
          take: 4,
        },
      },
    }),
    prisma.product.findMany({
      where: { isFeatured: true },
      select: productCardSelect,
      orderBy: [{ featuredOrder: "asc" }, { name: "asc" }],
      take: 8,
    }),
    prisma.brand.findMany({
      where: { isActive: true, products: { some: {} } },
      select: { name: true, slug: true, logoUrl: true },
      orderBy: { name: "asc" },
      take: 12,
    }),
  ]);

  const isEmpty = categories.length === 0 && featured.length === 0;

  return (
    <>
      {settings.promoBannerText && (
        <div className="mb-6 border border-accent/40 bg-accent/5 px-4 py-3 text-center text-caption text-ink">
          {settings.promoBannerLink ? (
            <Link href={settings.promoBannerLink} className="hover:text-brand">
              {settings.promoBannerText}
            </Link>
          ) : (
            settings.promoBannerText
          )}
        </div>
      )}

      {/*
        The hero states plainly what the site does and how ordering works, then
        gets out of the way — its job is to get someone browsing within a few
        seconds (DESIGN_SYSTEM.md §Layout).
      */}
      <section className="border-b border-border pb-8">
        <h1 className="max-w-2xl text-balance font-heading text-hero text-brand">
          Everything {settings.storeName} stocks, a message away.
        </h1>
        <p className="mt-3 max-w-xl text-body text-ink-muted">
          Browse the shelves, add what you need, and send the whole list to the
          shop on WhatsApp. No app to install, no account to create.
        </p>
      </section>

      {isEmpty && (
        <div className="mt-8">
          <EmptyState
            title="The catalog is being set up."
            hint="Products will appear here as soon as they're added."
          />
        </div>
      )}

      {featured.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 font-heading text-section text-ink">In the shop now</h2>
          <ProductGrid
            products={featured}
            whatsappNumber={settings.whatsappNumber}
            storeName={settings.storeName}
          />
        </section>
      )}

      {categories.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 font-heading text-section text-ink">Shop by category</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/c/${category.slug}`}
                className="flex flex-col border border-border bg-surface transition-colors hover:border-brand/40"
              >
                <div className="relative flex aspect-[4/3] items-center justify-center bg-background">
                  {category.imageUrl ? (
                    <Image
                      src={category.imageUrl}
                      alt=""
                      fill
                      className="object-contain p-4"
                      sizes="(max-width: 640px) 50vw, 25vw"
                    />
                  ) : (
                    <Package size={28} className="text-border" aria-hidden="true" />
                  )}
                </div>
                <div className="p-3">
                  <h3 className="text-body font-medium text-ink">{category.name}</h3>
                  {category.children.length > 0 && (
                    <p className="mt-1 line-clamp-2 text-caption text-ink-muted">
                      {category.children.map((c) => c.name).join(" · ")}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {brands.length > 0 && (
        <section className="mt-12">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-heading text-section text-ink">Brands we carry</h2>
            <Link href="/brands" className="text-caption text-ink-muted hover:text-brand">
              All brands
            </Link>
          </div>
          <ul className="flex flex-wrap gap-2">
            {brands.map((brand) => (
              <li key={brand.slug}>
                <Link
                  href={`/brand/${brand.slug}`}
                  className="block border border-border bg-surface px-3 py-2 text-caption text-ink hover:border-brand/40 hover:text-brand"
                >
                  {brand.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
