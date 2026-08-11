"use client";

import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/pricing";
import { ShoppingBag, ArrowRight } from "lucide-react";

export function StickyMobileBar() {
  const { totalItems, totalPrice, openCart } = useCart();

  if (totalItems === 0) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-center backdrop-blur sm:hidden">
        <p className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
          ⚡ Order on WhatsApp · Express Direct Delivery from Shop
        </p>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-surface/95 p-3 shadow-lg backdrop-blur sm:hidden">
      <button
        onClick={openCart}
        className="flex w-full items-center justify-between rounded-xl bg-emerald-600 px-4 py-3 text-white shadow-md transition-transform active:scale-98"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20">
            <ShoppingBag size={18} />
          </div>
          <div className="text-left">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-100">
              {totalItems} {totalItems === 1 ? "item" : "items"} added
            </p>
            <p className="price text-sm font-bold">{formatPrice(totalPrice)}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-bold">
          <span>View Order</span>
          <ArrowRight size={16} />
        </div>
      </button>
    </div>
  );
}
