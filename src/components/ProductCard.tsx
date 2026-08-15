"use client";

import Image from "next/image";
import Link from "next/link";
import { Package, Minus, Plus } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/pricing";

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
}: {
  product: ProductCardData;
  whatsappNumber?: string;
  storeName?: string;
}) {
  const { addItem, updateQuantity, items, openCart } = useCart();
  const inCart = items.find((i) => i.id === product.id);

  const hasDiscount = product.mrp != null && product.mrp > product.price;
  const discountPercent = hasDiscount
    ? Math.round(((product.mrp! - product.price) / product.mrp!) * 100)
    : 0;

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/80 bg-surface shadow-xs transition-all hover:border-brand/40 hover:shadow-md">
      {/* Product Image & Overlaid Actions Container */}
      <div className="relative aspect-square w-full shrink-0 bg-background/50">
        {/* Discount Badge on Top Left */}
        {hasDiscount && discountPercent > 0 && (
          <div className="absolute left-2 top-2 z-10 rounded-md bg-emerald-600 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold tracking-tight text-white shadow-xs">
            {discountPercent}% OFF
          </div>
        )}

        {/* Product Image Link */}
        <Link
          href={`/product/${product.slug}`}
          className="relative flex h-full w-full items-center justify-center p-2 sm:p-3.5"
        >
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-contain p-2 transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 20vw"
              unoptimized
            />
          ) : (
            <Package size={32} className="text-border" aria-hidden="true" />
          )}

          {!product.inStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-surface/80 backdrop-blur-xs">
              <span className="rounded-md border border-border bg-surface px-2 py-1 text-[10px] font-medium text-ink-muted">
                Out of stock
              </span>
            </div>
          )}
        </Link>

        {/* Instamart-style ADD Button Overlaid on Image (Bottom Right) */}
        {product.inStock && (
          <div className="absolute bottom-1.5 right-1.5 sm:bottom-2 sm:right-2 z-10">
            {inCart ? (
              <div className="flex h-8.5 sm:h-9.5 min-w-[92px] sm:min-w-[102px] items-center justify-between rounded-xl border-2 border-emerald-600 bg-surface shadow-md ring-2 ring-emerald-600/20">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    updateQuantity(product.id, inCart.quantity - 1);
                  }}
                  aria-label={`Remove one ${product.name}`}
                  className="flex h-8.5 w-8 sm:h-9.5 sm:w-9 items-center justify-center text-emerald-700 hover:bg-emerald-50 active:scale-85 transition-transform"
                >
                  <Minus size={15} className="stroke-[3]" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openCart();
                  }}
                  className="price flex-1 px-1 text-center text-xs sm:text-sm font-black text-emerald-800 select-none"
                  aria-label={`${inCart.quantity} in order`}
                >
                  {inCart.quantity}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    updateQuantity(product.id, inCart.quantity + 1);
                  }}
                  aria-label={`Add one more ${product.name}`}
                  className="flex h-8.5 w-8 sm:h-9.5 sm:w-9 items-center justify-center text-emerald-700 hover:bg-emerald-50 active:scale-85 transition-transform"
                >
                  <Plus size={15} className="stroke-[3]" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  addItem({
                    id: product.id,
                    name: product.name,
                    slug: product.slug,
                    price: product.price,
                    variant: product.variant,
                    imageUrl: product.imageUrl,
                  });
                }}
                aria-label={`Add ${product.name}`}
                className="flex h-8.5 w-8.5 sm:h-9.5 sm:w-9.5 items-center justify-center rounded-xl border-2 border-emerald-600 bg-surface text-emerald-600 shadow-md transition-all hover:bg-emerald-600 hover:text-white active:scale-90"
              >
                <Plus size={19} className="stroke-[3]" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Card Content Below Image */}
      <div className="flex flex-1 flex-col justify-between p-2 sm:p-3">
        <div>
          {/* Brand Name */}
          {product.brand && (
            <span className="block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-ink-muted">
              {product.brand.name}
            </span>
          )}

          {/* Product Title */}
          <h3 className="mt-0.5 line-clamp-2 text-xs font-semibold leading-snug text-ink sm:text-sm">
            <Link href={`/product/${product.slug}`} className="hover:text-brand">
              {product.name}
            </Link>
          </h3>

          {/* Variant Size Badge */}
          {product.variant && (
            <div className="mt-1 inline-block rounded border border-border/80 bg-background px-1.5 py-0.5 text-[9px] sm:text-[10px] font-medium text-ink-muted">
              {product.variant}
            </div>
          )}
        </div>

        {/* Pricing Row */}
        <div className="mt-2 pt-1 border-t border-border/50">
          {hasDiscount && discountPercent > 0 && (
            <span className="block text-[10px] font-bold text-emerald-600">
              {discountPercent}% OFF
            </span>
          )}
          <div className="flex items-baseline gap-1.5">
            <span className="price text-xs sm:text-sm font-bold text-ink">
              {formatPrice(product.price)}
            </span>
            {hasDiscount && (
              <span className="price text-[10px] sm:text-[11px] text-ink-muted line-through">
                {formatPrice(product.mrp!)}
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
