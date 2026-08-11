import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Package } from "lucide-react";
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

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

async function loadProduct(slug: string) {
  return prisma.product.findFirst({
    where: { slug, isArchived: false },
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

export async function generateStaticParams() {
  const products = await prisma.product.findMany({
    where: { isArchived: false },
    select: { slug: true },
    take: 30,
  });
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await loadProduct(slug);
  if (!product) return {};

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
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await loadProduct(slug);
  if (!product) notFound();

  const settings = await getSettings();

  const related = await prisma.product.findMany({
    where: { categoryId: product.category.id, NOT: { id: product.id }, isArchived: false },
    select: productCardSelect,
    orderBy: [{ inStock: "desc" }, { name: "asc" }],
    take: 4,
  });

  const parent = product.category.parent;
  const categoryHref = parent
    ? `/c/${parent.slug}/${product.category.slug}`
    : `/c/${product.category.slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    ...(product.description ? { description: product.description } : {}),
    ...(product.imageUrl ? { image: product.imageUrl } : {}),
    ...(product.brand ? { brand: { "@type": "Brand", name: product.brand.name } } : {}),
    ...(product.sku ? { sku: product.sku } : {}),
    offers: {
      "@type": "Offer",
      price: product.price.toFixed(2),
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
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          ...(parent ? [{ label: parent.name, href: `/c/${parent.slug}` }] : []),
          { label: product.category.name, href: categoryHref },
          { label: product.name },
        ]}
      />

      <div className="grid gap-8 md:grid-cols-2">
        <div className="relative flex aspect-square items-center justify-center border border-border bg-surface">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-contain p-8"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
          ) : (
            <Package size={48} className="text-border" aria-hidden="true" />
          )}
        </div>

        <div>
          {product.brand && (
            <Link
              href={`/brand/${product.brand.slug}`}
              className="text-caption uppercase tracking-wide text-ink-muted hover:text-brand"
            >
              {product.brand.name}
            </Link>
          )}

          <h1 className="mt-1 font-heading text-section text-ink">{product.name}</h1>

          {product.variant && (
            <p className="mt-1 text-body text-ink-muted">{product.variant}</p>
          )}

          <div className="mt-5 border-y border-border py-4">
            <Price price={product.price} mrp={product.mrp} size="lg" align="left" />
            {product.mrp != null && product.mrp > product.price && (
              <p className="mt-1 text-caption text-ink-muted">Inclusive of all taxes</p>
            )}
          </div>

          {product.inStock ? (
            <div className="mt-5 flex flex-col gap-3">
              <a
                href={buildProductOrderLink(product, settings.whatsappNumber, settings.storeName)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-whatsapp w-full py-3"
              >
                <WhatsAppIcon />
                Order on WhatsApp
              </a>

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

              <p className="text-caption text-ink-muted">
                Ordering opens WhatsApp with this item filled in. The shop confirms
                availability and the final total before anything is sent out.
              </p>
            </div>
          ) : (
            <div className="mt-5 border border-border bg-background px-4 py-3">
              <p className="text-body text-ink">Out of stock right now.</p>
              <p className="mt-1 text-caption text-ink-muted">
                Message the shop to ask when it&rsquo;s back, or whether they can
                order it in.
              </p>
            </div>
          )}

          {product.description && (
            <div className="mt-8">
              <h2 className="mb-2 font-heading text-body text-ink">About this product</h2>
              <p className="whitespace-pre-line text-body text-ink-muted">
                {product.description}
              </p>
            </div>
          )}

          <dl className="mt-8 border-t border-border pt-4 text-caption">
            <div className="flex justify-between border-b border-border py-2">
              <dt className="text-ink-muted">Category</dt>
              <dd>
                <Link href={categoryHref} className="text-ink hover:text-brand">
                  {product.category.name}
                </Link>
              </dd>
            </div>
            {product.brand && (
              <div className="flex justify-between border-b border-border py-2">
                <dt className="text-ink-muted">Brand</dt>
                <dd>
                  <Link
                    href={`/brand/${product.brand.slug}`}
                    className="text-ink hover:text-brand"
                  >
                    {product.brand.name}
                  </Link>
                </dd>
              </div>
            )}
            {product.sku && (
              <div className="flex justify-between border-b border-border py-2">
                <dt className="text-ink-muted">Code</dt>
                <dd className="price text-ink">{product.sku}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-4 font-heading text-section text-ink">
            More in {product.category.name}
          </h2>
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
