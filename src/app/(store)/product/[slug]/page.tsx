import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShieldCheck, Truck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { productCardSelect } from "@/lib/queries";
import { buildProductOrderLink } from "@/lib/whatsapp";
import { formatPrice } from "@/lib/pricing";
import { Price } from "@/components/Price";
import { ProductGrid } from "@/components/ProductGrid";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";
import { AddToOrderButton } from "@/components/AddToOrderButton";
import { ProductDetailImage } from "@/components/ProductDetailImage";

export const dynamic = "force-dynamic";
export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

async function loadProduct(rawSlug: string) {
  if (!rawSlug) return null;
  const slug = rawSlug.trim();
  const decoded = decodeURIComponent(slug);

  return prisma.product.findFirst({
    where: {
      OR: [{ slug }, { slug: decoded }],
      isArchived: false,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      sku: true,
      price: true,
      mrp: true,
      variant: true,
      description: true,
      imageUrl: true,
      inStock: true,
      brand: { select: { name: true, slug: true } },
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
          parent: { select: { name: true, slug: true } },
        },
      },
    },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const { slug } = await params;
    const product = await loadProduct(slug);
    if (!product) return { title: "Product Not Found" };

    const title = product.variant ? `${product.name} (${product.variant})` : product.name;
    const description =
      product.description ??
      `${product.name} at ${formatPrice(product.price)}. Order from Shilpa on WhatsApp.`;

    return {
      title,
      description,
      alternates: { canonical: `/product/${product.slug}` },
      openGraph: {
        title,
        description,
        type: "website",
        ...(product.imageUrl ? { images: [{ url: product.imageUrl }] } : {}),
      },
    };
  } catch {
    return { title: "Product" };
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;

  // Run product lookup and settings fetch in parallel — saves one round-trip.
  const [product, settings] = await Promise.all([
    loadProduct(slug).catch(() => null),
    getSettings(),
  ]);
  if (!product) notFound();

  // Load related products in this subcategory (non-critical — empty on error).
  const categoryId = product.category?.id;
  const related = categoryId
    ? await prisma.product
        .findMany({
          where: { categoryId, NOT: { id: product.id }, isArchived: false },
          select: productCardSelect,
          orderBy: [{ inStock: "desc" }, { name: "asc" }],
        })
        .catch(() => [])
    : [];

  const categoryName = product.category?.name || "General";
  const categorySlug = product.category?.slug || "";
  const parent = product.category?.parent;
  const categoryHref = parent
    ? `/c/${parent.slug}/${categorySlug}`
    : categorySlug
    ? `/c/${categorySlug}`
    : "/";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    ...(product.description ? { description: product.description } : {}),
    ...(product.imageUrl ? { image: product.imageUrl } : {}),
    ...(product.brand ? { brand: { "@type": "Brand", name: product.brand.name } } : {}),
    offers: {
      "@type": "Offer",
      price: (product.price ?? 0).toFixed(2),
      priceCurrency: "INR",
      availability: product.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      ...(process.env.NEXT_PUBLIC_SITE_URL
        ? { url: `${process.env.NEXT_PUBLIC_SITE_URL}/product/${product.slug}` }
        : {}),
    },
  };

  return (
    <>
      <div className="hidden sm:block">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            ...(parent ? [{ label: parent.name, href: `/c/${parent.slug}` }] : []),
            ...(product.category ? [{ label: categoryName, href: categoryHref }] : []),
            { label: product.name },
          ]}
        />
      </div>

      <div className="grid gap-5 sm:gap-8 md:grid-cols-2 mt-2 sm:mt-0">
        {/* Product Image Frame */}
        <ProductDetailImage
          imageUrl={product.imageUrl}
          name={product.name}
          inStock={product.inStock}
        />

        {/* Product Info & Actions */}
        <div className="flex flex-col justify-start">
          {product.brand && (
            <Link
              href={`/brand/${product.brand.slug}`}
              className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-ink-muted hover:text-brand"
            >
              {product.brand.name}
            </Link>
          )}

          <h1 className="mt-1 font-heading text-lg sm:text-2xl font-bold text-ink leading-tight">
            {product.name}
          </h1>

          {product.variant && (
            <div className="mt-2 inline-block rounded-md border border-border/80 bg-background px-2 py-1 text-xs font-medium text-ink-muted w-fit">
              {product.variant}
            </div>
          )}

          <div className="mt-4 border-y border-border/70 py-3.5">
            <Price price={product.price} mrp={product.mrp} size="lg" align="left" />
            <p className="mt-1 text-[11px] text-ink-muted">Inclusive of all taxes</p>
          </div>

          {/* Quick Badges */}
          <div className="mt-3 flex items-center gap-4 text-xs text-ink-muted">
            <div className="flex items-center gap-1.5">
              <Truck size={15} className="text-emerald-600" />
              <span>Express Delivery</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={15} className="text-emerald-600" />
              <span>100% Genuine</span>
            </div>
          </div>

          {/* Action Buttons */}
          {product.inStock ? (
            <div className="mt-5 flex flex-col gap-3">
              <AddToOrderButton
                product={{
                  id: product.id,
                  name: product.name,
                  slug: product.slug,
                  price: product.price,
                  variant: product.variant,
                  imageUrl: product.imageUrl,
                }}
              />

              <a
                href={buildProductOrderLink(
                  product,
                  settings.whatsappNumber,
                  settings.storeName
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-whatsapp w-full py-3 rounded-xl shadow-xs"
              >
                <WhatsAppIcon />
                Order on WhatsApp
              </a>

              <p className="text-[11px] text-ink-muted text-center">
                Add to your order or message the shop directly on WhatsApp to confirm delivery.
              </p>
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-border bg-background p-4 text-center">
              <p className="text-sm font-semibold text-ink">Out of stock right now.</p>
              <p className="mt-1 text-xs text-ink-muted">
                Message the shop to ask when it will be back in stock.
              </p>
            </div>
          )}

          {product.description && (
            <div className="mt-6 border-t border-border/70 pt-4">
              <h2 className="mb-1.5 font-heading text-sm font-bold text-ink">About this product</h2>
              <p className="whitespace-pre-line text-xs sm:text-sm text-ink-muted leading-relaxed">
                {product.description}
              </p>
            </div>
          )}

          <dl className="mt-6 border-t border-border/70 pt-3 text-xs">
            {product.category && (
              <div className="flex justify-between border-b border-border/50 py-2">
                <dt className="text-ink-muted">Category</dt>
                <dd>
                  <Link href={categoryHref} className="text-ink hover:text-brand font-medium">
                    {categoryName}
                  </Link>
                </dd>
              </div>
            )}
            {product.brand && (
              <div className="flex justify-between border-b border-border/50 py-2">
                <dt className="text-ink-muted">Brand</dt>
                <dd>
                  <Link
                    href={`/brand/${product.brand.slug}`}
                    className="text-ink hover:text-brand font-medium"
                  >
                    {product.brand.name}
                  </Link>
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-12 sm:mt-16">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-heading text-base sm:text-xl font-bold text-ink">
              More in {categoryName}
            </h2>
            <span className="text-xs text-ink-muted">{related.length} items</span>
          </div>
          <ProductGrid
            products={related}
            whatsappNumber={settings.whatsappNumber}
            storeName={settings.storeName}
          />
        </section>
      )}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  );
}
