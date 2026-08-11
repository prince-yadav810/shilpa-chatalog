"use client";

import Image from "next/image";
import Link from "next/link";
import { Package, Minus, Plus } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/pricing";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";
import { buildProductOrderLink } from "@/lib/whatsapp";

export type ProductCardData = {
  id: string;
  name: string;
  slug: string;
  price: number;
  mrp: number | null;
  variant: string | null;
  imageUrl: string | null;
  inStock: boolean;
  brand: { name: string; slug: string } | null;
};

export function ProductCard({
  product,
  whatsappNumber,
  storeName,
}: {
  product: ProductCardData;
  whatsappNumber: string;
  storeName: string;
}) {
  const { addItem, updateQuantity, items, openCart } = useCart();
  const inCart = items.find((i) => i.id === product.id);

  const hasDiscount = product.mrp != null && product.mrp > product.price;
  const discountPercent = hasDiscount
    ? Math.round(((product.mrp! - product.price) / product.mrp!) * 100)
    : 0;

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/80 bg-surface shadow-xs transition-all hover:border-brand/50 hover:shadow-md">
      {/* Discount Badge */}
      {hasDiscount && discountPercent > 0 && (
        <div className="absolute left-2 top-2 z-10 rounded-md bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold tracking-tight text-white shadow-xs">
          {discountPercent}% OFF
        </div>
      )}

      {/* Product Image Link */}
      <Link
        href={`/product/${product.slug}`}
        className="relative flex aspect-square w-full shrink-0 items-center justify-center bg-background/50 p-2 sm:p-4"
      >
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-contain p-2 transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 20vw"
          />
        ) : (
          <Package size={32} className="text-border" aria-hidden="true" />
        )}

        {!product.inStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface/80 backdrop-blur-xs">
            <span className="rounded-md border border-border bg-surface px-2 py-1 text-[11px] font-medium text-ink-muted">
              Out of stock
            </span>
          </div>
        )}
      </Link>

      {/* Card Content */}
      <div className="flex flex-1 flex-col justify-between p-2.5 sm:p-3.5">
        <div>
          {/* Brand Name */}
          {product.brand && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
              {product.brand.name}
            </span>
          )}

          {/* Product Title */}
          <h3 className="mt-0.5 text-xs font-semibold leading-snug text-ink sm:text-sm">
            <Link href={`/product/${product.slug}`} className="hover:text-brand">
              {product.name}
            </Link>
          </h3>

          {/* Variant Size Badge */}
          {product.variant && (
            <div className="mt-1.5 inline-block rounded-md border border-border/80 bg-background px-1.5 py-0.5 text-[10px] font-medium text-ink-muted sm:text-[11px]">
              {product.variant}
            </div>
          )}
        </div>

        {/* Pricing & Actions */}
        <div className="mt-3">
          <div className="flex items-baseline gap-1.5">
            <span className="price text-sm font-bold text-ink sm:text-base">
              {formatPrice(product.price)}
            </span>
            {hasDiscount && (
              <span className="price text-[11px] text-ink-muted line-through">
                {formatPrice(product.mrp!)}
              </span>
            )}
          </div>

          {/* Add to Order / Quantity Button (Blinkit Quick-Commerce Style) */}
          {product.inStock ? (
            <div className="mt-2.5 flex items-center gap-1.5">
              {inCart ? (
                <div className="flex h-8 flex-1 items-center justify-between rounded-lg border border-brand bg-brand/5">
                  <button
                    onClick={() => updateQuantity(product.id, inCart.quantity - 1)}
                    aria-label={`Remove one ${product.name}`}
                    className="flex h-8 w-8 items-center justify-center text-brand hover:bg-brand/10 active:scale-95"
                  >
                    <Minus size={13} />
                  </button>
                  <button
                    onClick={openCart}
                    className="price text-center text-xs font-bold text-brand"
                    aria-label={`${inCart.quantity} in order`}
                  >
                    {inCart.quantity}
                  </button>
                  <button
                    onClick={() => updateQuantity(product.id, inCart.quantity + 1)}
                    aria-label={`Add one more ${product.name}`}
                    className="flex h-8 w-8 items-center justify-center text-brand hover:bg-brand/10 active:scale-95"
                  >
                    <Plus size={13} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() =>
                    addItem({
                      id: product.id,
                      name: product.name,
                      slug: product.slug,
                      price: product.price,
                      variant: product.variant,
                      imageUrl: product.imageUrl,
                    })
                  }
                  className="flex h-8 flex-1 items-center justify-center gap-1 rounded-lg border border-emerald-600 bg-emerald-600/5 text-xs font-bold text-emerald-700 transition-all hover:bg-emerald-600 hover:text-white active:scale-95 dark:border-emerald-500 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500 dark:hover:text-white"
                >
                  <Plus size={14} />
                  ADD
                </button>
              )}

              {/* Direct WhatsApp Quick Order Button */}
              <a
                href={buildProductOrderLink(product, whatsappNumber, storeName)}
                target="_blank"
                rel="noopener noreferrer"
                title={`Order ${product.name} on WhatsApp`}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white transition-all hover:bg-emerald-700 active:scale-95"
              >
                <WhatsAppIcon className="h-4 w-4 fill-current" />
              </a>
            </div>
          ) : (
            <div className="mt-2.5 flex h-8 items-center justify-center rounded-lg border border-border bg-background text-[11px] font-medium text-ink-muted">
              Out of stock
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
