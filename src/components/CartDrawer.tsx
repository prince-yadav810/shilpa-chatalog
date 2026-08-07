"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { X, Minus, Plus, Trash2, Package } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";
import { buildCartOrderLink } from "@/lib/whatsapp";
import { formatPrice } from "@/lib/pricing";

export function CartDrawer({
  whatsappNumber,
  storeName,
}: {
  whatsappNumber: string;
  storeName: string;
}) {
  const {
    items,
    isOpen,
    closeCart,
    removeItem,
    updateQuantity,
    totalItems,
    totalPrice,
    clearCart,
  } = useCart();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeCart();
    }
    if (isOpen) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, closeCart]);

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-ink/30"
          onClick={closeCart}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full flex-col border-l border-border bg-surface transition-transform duration-200 sm:w-96 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        aria-label="Your order"
        aria-hidden={!isOpen}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-heading text-lg text-brand">
            Your order{totalItems > 0 ? ` (${totalItems})` : ""}
          </h2>
          <button
            onClick={closeCart}
            aria-label="Close"
            className="p-1.5 text-ink-muted hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <Package size={36} className="text-border" aria-hidden="true" />
              <p className="text-body text-ink">Nothing added yet.</p>
              <p className="text-caption text-ink-muted">
                Add items from the catalog and send the whole list to the shop in
                one WhatsApp message.
              </p>
              <button onClick={closeCart} className="btn-secondary mt-1">
                Browse products
              </button>
            </div>
          ) : (
            <ul className="flex flex-col">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex gap-3 border-b border-border py-4 first:pt-0 last:border-0"
                >
                  <Link
                    href={`/product/${item.slug}`}
                    onClick={closeCart}
                    className="relative h-16 w-16 shrink-0 border border-border bg-background"
                  >
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        className="object-contain p-1"
                        sizes="64px"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-border">
                        <Package size={18} aria-hidden="true" />
                      </span>
                    )}
                  </Link>

                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/product/${item.slug}`}
                      onClick={closeCart}
                      className="block text-body font-medium leading-snug text-ink hover:text-brand"
                    >
                      {item.name}
                    </Link>
                    {item.variant && (
                      <p className="text-caption text-ink-muted">{item.variant}</p>
                    )}

                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex items-center border border-border">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          aria-label={`Remove one ${item.name}`}
                          className="flex h-7 w-7 items-center justify-center text-ink-muted hover:text-ink"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="price w-7 text-center text-caption text-ink">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          aria-label={`Add one more ${item.name}`}
                          className="flex h-7 w-7 items-center justify-center text-ink-muted hover:text-ink"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                      <span className="price flex-1 text-caption text-ink-muted">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                      <button
                        onClick={() => removeItem(item.id)}
                        aria-label={`Remove ${item.name}`}
                        className="p-1 text-ink-muted hover:text-ink"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-border px-5 py-4">
            <div className="flex items-baseline justify-between">
              <span className="text-body text-ink-muted">Total</span>
              <span className="price text-2xl font-medium text-ink">
                {formatPrice(totalPrice)}
              </span>
            </div>

            <a
              href={buildCartOrderLink(items, whatsappNumber, storeName)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-whatsapp w-full py-3"
            >
              <WhatsAppIcon />
              Send order on WhatsApp
            </a>

            <p className="text-center text-caption text-ink-muted">
              This opens WhatsApp with your list ready to send. The shop will
              confirm availability and total.
            </p>

            <button
              onClick={clearCart}
              className="text-center text-caption text-ink-muted underline underline-offset-2 hover:text-ink"
            >
              Clear order
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
