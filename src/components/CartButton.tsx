"use client";

import { ShoppingBag } from "lucide-react";
import { useCart } from "@/context/CartContext";

export function CartButton() {
  const { totalItems, openCart, isReady } = useCart();

  return (
    <button
      onClick={openCart}
      className="relative flex h-9 items-center gap-2 border border-border px-3 text-caption text-ink hover:bg-background"
      aria-label={`Your order — ${totalItems} item${totalItems === 1 ? "" : "s"}`}
    >
      <ShoppingBag size={16} aria-hidden="true" />
      <span className="hidden sm:inline">Your order</span>
      {/* isReady gates this so the server-rendered 0 doesn't flash before the
          stored cart loads. */}
      {isReady && totalItems > 0 && (
        <span className="price bg-brand px-1.5 py-0.5 text-caption leading-none text-white">
          {totalItems}
        </span>
      )}
    </button>
  );
}
