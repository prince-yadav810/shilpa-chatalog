"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import {
  ArrowRight,
  Minus,
  Package,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  Truck,
  X,
} from "lucide-react";
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
        <button
          type="button"
          onClick={closeCart}
          aria-label="Close order"
          className="fixed inset-0 z-40 cursor-default bg-[#241915]/35 backdrop-blur-[2px]"
        />
      )}

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Your order"
        aria-hidden={!isOpen}
        className={`fixed inset-x-0 bottom-0 z-50 flex h-[min(92dvh,780px)] w-full flex-col overflow-hidden rounded-t-[2rem] border border-b-0 border-[#e5d8d0] bg-[#fffdfb] shadow-[0_-18px_48px_rgba(47,29,22,0.22)] transition-transform duration-300 ease-out sm:inset-y-0 sm:left-auto sm:right-0 sm:h-full sm:w-[27rem] sm:rounded-none sm:border-b sm:border-r-0 sm:shadow-[-18px_0_48px_rgba(47,29,22,0.16)] ${
          isOpen ? "translate-y-0 sm:translate-x-0" : "translate-y-full sm:translate-x-full"
        }`}
      >
        <div className="mx-auto mt-2 h-1.5 w-11 rounded-full bg-[#dbcac0] sm:hidden" aria-hidden="true" />

        <header className="border-b border-[#eee2db] px-4 pb-3 pt-3 sm:px-5 sm:pt-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#bf4b36]">Ready when you are</p>
              <h2 className="mt-0.5 font-heading text-2xl font-semibold tracking-tight text-[#30211c]">
                Your order
              </h2>
              <p className="mt-0.5 text-xs text-ink-muted">
                {totalItems > 0
                  ? `${totalItems} ${totalItems === 1 ? "item" : "items"} in your bag`
                  : "Add your everyday essentials here"}
              </p>
            </div>
            <button
              type="button"
              onClick={closeCart}
              aria-label="Close order"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f8eee8] text-[#6e4e41] transition hover:bg-[#f1dfd4] active:scale-95"
            >
              <X size={19} strokeWidth={2.5} />
            </button>
          </div>

          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#e8f5ea] px-2.5 py-1 text-[10px] font-bold text-[#167447]">
            <Truck size={13} strokeWidth={2.7} />
            Free home delivery on every order
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[#fffaf7] px-3 py-3 sm:px-4 sm:py-4">
          {items.length === 0 ? (
            <div className="flex min-h-full flex-col items-center justify-center px-6 pb-12 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-[#fff0e5] text-[#dc5538] shadow-[0_8px_20px_rgba(194,87,54,0.12)]">
                <ShoppingBag size={29} strokeWidth={2.2} />
              </span>
              <h3 className="mt-4 font-heading text-xl font-semibold text-[#37251f]">Your bag is waiting.</h3>
              <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-ink-muted">
                Add a few things, then send one neat list to Shilpa on WhatsApp.
              </p>
              <button
                type="button"
                onClick={closeCart}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#1f3d3a] px-4 py-2.5 text-sm font-bold text-white shadow-[0_8px_18px_rgba(31,61,58,0.18)] transition hover:bg-[#183330]"
              >
                Browse products <ArrowRight size={15} strokeWidth={2.8} />
              </button>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="rounded-2xl border border-[#ecdfd8] bg-surface p-3 shadow-[0_4px_14px_rgba(95,54,31,0.06)]"
                >
                  <div className="flex gap-3">
                    <Link
                      href={`/product/${item.slug}`}
                      onClick={closeCart}
                      className="relative flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#f0e4dc] bg-[#fff8f2]"
                    >
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          fill
                          unoptimized
                          className="object-contain p-1.5"
                          sizes="72px"
                        />
                      ) : (
                        <Package size={21} className="text-[#dfc8bb]" aria-hidden="true" />
                      )}
                    </Link>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/product/${item.slug}`}
                          onClick={closeCart}
                          className="line-clamp-2 text-sm font-bold leading-snug text-ink hover:text-brand"
                        >
                          {item.name}
                        </Link>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          aria-label={`Remove ${item.name}`}
                          className="-mr-1 -mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#a47c6b] transition hover:bg-[#fff0e9] hover:text-[#c94937]"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                      {item.variant && <p className="mt-0.5 text-[11px] text-ink-muted">{item.variant}</p>}
                      <p className="price mt-1 text-left text-sm font-bold text-ink">{formatPrice(item.price)}</p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-[#f1e6e0] pt-2.5">
                    <div className="inline-flex items-center rounded-xl border border-[#d8e8dc] bg-[#f7fcf8] p-0.5 shadow-inner">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        aria-label={`Remove one ${item.name}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-[#277650] transition hover:bg-[#e6f4e9] active:scale-90"
                      >
                        <Minus size={15} strokeWidth={2.8} />
                      </button>
                      <span className="price w-9 text-center text-sm font-bold text-[#1c4f38]">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        aria-label={`Add one more ${item.name}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#248353] text-white shadow-sm transition hover:bg-[#176b40] active:scale-90"
                      >
                        <Plus size={16} strokeWidth={3} />
                      </button>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-medium text-ink-muted">Item total</p>
                      <p className="price text-sm font-bold text-ink">{formatPrice(item.price * item.quantity)}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <footer className="border-t border-[#e9ddd6] bg-surface px-4 py-3 shadow-[0_-10px_26px_rgba(95,54,31,0.08)] sm:px-5 sm:py-4">
            <div className="rounded-2xl bg-[#fff4ec] px-3.5 py-3">
              <div className="flex items-center justify-between text-xs text-[#795a4d]">
                <span>Items ({totalItems})</span>
                <span className="price">{formatPrice(totalPrice)}</span>
              </div>
              <div className="mt-1.5 flex items-center justify-between text-xs font-bold text-[#1b7b4a]">
                <span className="inline-flex items-center gap-1"><Truck size={13} strokeWidth={2.7} /> Delivery</span>
                <span>FREE</span>
              </div>
              <div className="mt-2.5 flex items-baseline justify-between border-t border-[#eeddd2] pt-2.5">
                <span className="font-heading text-base font-semibold text-[#392720]">Order total</span>
                <span className="price text-xl font-bold text-[#30211c]">{formatPrice(totalPrice)}</span>
              </div>
            </div>

            <a
              href={buildCartOrderLink(items, whatsappNumber, storeName)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#07954d] px-4 py-3.5 text-sm font-bold text-white shadow-[0_9px_18px_rgba(7,149,77,0.22)] transition hover:bg-[#067d40] active:scale-[0.99]"
            >
              <WhatsAppIcon />
              Send order on WhatsApp
              <ArrowRight size={16} strokeWidth={2.8} />
            </a>

            <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-[10px] leading-snug text-ink-muted">
              <ShieldCheck size={12} className="shrink-0 text-[#21814d]" strokeWidth={2.5} />
              We&apos;ll confirm availability and your final order on WhatsApp.
            </p>

            <button
              type="button"
              onClick={clearCart}
              className="mx-auto mt-2 block text-xs font-medium text-[#977869] underline decoration-[#d9c2b7] underline-offset-2 transition hover:text-[#5d4035]"
            >
              Clear order
            </button>
          </footer>
        )}
      </aside>
    </>
  );
}
