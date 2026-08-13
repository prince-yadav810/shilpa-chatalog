import Image from "next/image";
import Link from "next/link";
import { Package } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { productCardSelect } from "@/lib/queries";
import { ProductGrid, EmptyState } from "@/components/ProductGrid";

export const dynamic = "force-dynamic";
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
      where: { isFeatured: true, isArchived: false },
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
        <div className="mb-4 border border-accent/40 bg-accent/5 px-4 py-2.5 text-center text-caption text-ink rounded-xl">
          {settings.promoBannerLink ? (
            <Link href={settings.promoBannerLink} className="hover:text-brand font-medium">
              {settings.promoBannerText}
            </Link>
          ) : (
            settings.promoBannerText
          )}
        </div>
      )}

      {/* Hero Section */}
      <section className="border-b border-border pb-6">
        <h1 className="max-w-2xl text-balance font-heading text-hero text-brand">
          Everything {settings.storeName} stocks, a message away.
        </h1>
        <p className="mt-2 max-w-xl text-body text-ink-muted">
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

      {/* Top 3D Category Logos Grid */}
      {categories.length > 0 && (
        <section className="mt-6 sm:mt-8">
          <h2 className="mb-4 font-heading text-lg sm:text-xl font-bold text-ink">
            Shop by Category
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/c/${category.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-surface p-3 shadow-xs transition-all hover:border-brand/40 hover:shadow-md"
              >
                <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl bg-background/50 p-1">
                  {category.imageUrl ? (
                    <Image
                      src={category.imageUrl}
                      alt={category.name}
                      fill
                      className="object-contain p-1 scale-115 transition-transform duration-300 group-hover:scale-125"
                      sizes="(max-width: 640px) 45vw, 25vw"
                    />
                  ) : (
                    <Package size={36} className="text-border" aria-hidden="true" />
                  )}
                </div>
                <div className="mt-3 text-center">
                  <h3 className="text-xs font-bold text-ink sm:text-sm">{category.name}</h3>
                  {category.children.length > 0 && (
                    <p className="mt-1 line-clamp-2 text-[10px] text-ink-muted sm:text-[11px]">
                      {category.children.map((c) => c.name).join(" · ")}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured Products */}
      {featured.length > 0 && (
        <section className="mt-10 sm:mt-12">
          <h2 className="mb-4 font-heading text-lg sm:text-xl font-bold text-ink">
            In the shop now
          </h2>
          <ProductGrid
            products={featured}
            whatsappNumber={settings.whatsappNumber}
            storeName={settings.storeName}
          />
        </section>
      )}

      {/* Brands Carry Section */}
      {brands.length > 0 && (
        <section className="mt-10 sm:mt-12">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-heading text-lg sm:text-xl font-bold text-ink">Brands we carry</h2>
            <Link href="/brands" className="text-xs font-semibold text-brand hover:underline">
              All brands &rarr;
            </Link>
          </div>
          <ul className="flex flex-wrap gap-2">
            {brands.map((brand) => (
              <li key={brand.slug}>
                <Link
                  href={`/brand/${brand.slug}`}
                  className="block rounded-xl border border-border/80 bg-surface px-3 py-2 text-xs font-semibold text-ink transition-colors hover:border-brand/40 hover:text-brand"
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
