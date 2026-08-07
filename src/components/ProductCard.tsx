"use client";

import Image from "next/image";
import Link from "next/link";
import { Package, Minus, Plus } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { Price } from "@/components/Price";
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

  return (
    <article className="group flex h-full flex-col border border-border bg-surface transition-colors hover:border-brand/40">
      <Link
        href={`/product/${product.slug}`}
        className="relative flex aspect-square w-full shrink-0 items-center justify-center bg-background"
      >
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-contain p-4"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <Package size={32} className="text-border" aria-hidden="true" />
        )}

        {!product.inStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface/70">
            <span className="border border-border bg-surface px-2 py-1 text-caption text-ink-muted">
              Out of stock
            </span>
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
        {product.brand && (
          <span className="text-caption uppercase tracking-wide text-ink-muted">
            {product.brand.name}
          </span>
        )}

        <h3 className="text-body font-medium leading-snug text-ink">
          <Link href={`/product/${product.slug}`} className="hover:text-brand">
            {product.name}
          </Link>
        </h3>

        {product.variant && (
          <p className="text-caption text-ink-muted">{product.variant}</p>
        )}

        <div className="flex-1" />

        <div className="mt-3">
          <Price price={product.price} mrp={product.mrp} size="sm" />
        </div>

        {product.inStock ? (
          <div className="mt-3 flex gap-2">
            {inCart ? (
              <div className="flex flex-1 items-center justify-between border border-border">
                <button
                  onClick={() => updateQuantity(product.id, inCart.quantity - 1)}
                  aria-label={`Remove one ${product.name}`}
                  className="flex h-9 w-9 items-center justify-center text-ink-muted hover:bg-background hover:text-ink"
                >
                  <Minus size={14} />
                </button>
                <button
                  onClick={openCart}
                  className="price flex-1 text-center text-body font-medium text-brand"
                  aria-label={`${inCart.quantity} in your order — open order`}
                >
                  {inCart.quantity}
                </button>
                <button
                  onClick={() => updateQuantity(product.id, inCart.quantity + 1)}
                  aria-label={`Add one more ${product.name}`}
                  className="flex h-9 w-9 items-center justify-center text-ink-muted hover:bg-background hover:text-ink"
                >
                  <Plus size={14} />
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
                className="btn-secondary h-9 flex-1 px-2 py-0 text-caption"
              >
                Add to order
              </button>
            )}

            <a
              href={buildProductOrderLink(product, whatsappNumber, storeName)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Order ${product.name} on WhatsApp`}
              className="btn-whatsapp h-9 flex-1 px-2 py-0 text-caption"
            >
              <WhatsAppIcon className="h-3.5 w-3.5 shrink-0" />
              Order
            </a>
          </div>
        ) : (
          <p className="mt-3 border border-border bg-background py-2 text-center text-caption text-ink-muted">
            Out of stock
          </p>
        )}
      </div>
    </article>
  );
}
