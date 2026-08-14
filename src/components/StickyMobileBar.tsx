"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/pricing";
import { Home, LayoutGrid, ShoppingBag, ArrowRight } from "lucide-react";

export function StickyMobileBar() {
  const pathname = usePathname();
  const { totalItems, totalPrice, openCart, isReady } = useCart();

  const isHome = pathname === "/";
  const isCategories = pathname.startsWith("/c/") || pathname === "/brands" || pathname.startsWith("/brand/");

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 sm:hidden">
      {/* Top Banner / Order Summary Pill above bottom tabs */}
      {totalItems > 0 ? (
        <div className="bg-surface/98 px-3 pt-2 pb-1.5 border-t border-border/80 shadow-md backdrop-blur">
          <button
            type="button"
            onClick={openCart}
            className="flex w-full items-center justify-between rounded-xl bg-emerald-600 px-3.5 py-2.5 text-white shadow-md transition-transform active:scale-98"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-7.5 w-7.5 items-center justify-center rounded-lg bg-white/20">
                <ShoppingBag size={16} />
              </div>
              <div className="text-left">
                <p className="text-[11px] font-bold text-emerald-100 leading-tight">
                  {totalItems} {totalItems === 1 ? "item" : "items"} added
                </p>
                <p className="price text-xs font-bold leading-tight">
                  {formatPrice(totalPrice)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-xs font-bold">
              <span>View Order</span>
              <ArrowRight size={14} />
            </div>
          </button>
        </div>
      ) : (
        <div className="border-t border-emerald-500/20 bg-emerald-50 px-3 py-1 text-center backdrop-blur">
          <p className="text-[10px] font-bold tracking-tight text-emerald-800">
            FREE DELIVERY on orders above ₹99
          </p>
        </div>
      )}

      {/* 3-Tab Bottom Navigation Bar (Instamart style: Home, Categories, Cart) */}
      <nav
        aria-label="Mobile Navigation"
        className="flex h-13 items-center justify-around border-t border-border/80 bg-surface/98 px-2 backdrop-blur shadow-lg"
      >
        {/* Tab 1: Home */}
        <Link
          href="/"
          className={`flex flex-1 flex-col items-center justify-center py-1 transition-colors ${
            isHome ? "text-ink font-bold" : "text-ink-muted hover:text-ink"
          }`}
        >
          <div className="relative">
            <Home
              size={20}
              className={isHome ? "stroke-[2.5] text-ink" : "text-ink-muted"}
            />
          </div>
          <span className="mt-0.5 text-[10px] leading-tight">Home</span>
        </Link>

        {/* Tab 2: Categories */}
        <Link
          href="/brands"
          className={`flex flex-1 flex-col items-center justify-center py-1 transition-colors ${
            isCategories ? "text-ink font-bold" : "text-ink-muted hover:text-ink"
          }`}
        >
          <div className="relative">
            <LayoutGrid
              size={20}
              className={isCategories ? "stroke-[2.5] text-ink" : "text-ink-muted"}
            />
          </div>
          <span className="mt-0.5 text-[10px] leading-tight">Categories</span>
        </Link>

        {/* Tab 3: Cart / Order */}
        <button
          type="button"
          onClick={openCart}
          className="flex flex-1 flex-col items-center justify-center py-1 text-ink-muted hover:text-ink transition-colors"
        >
          <div className="relative">
            <ShoppingBag size={20} className="text-ink-muted" />
            {isReady && totalItems > 0 && (
              <span className="price absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600 px-1 text-[9px] font-bold text-white shadow-xs">
                {totalItems}
              </span>
            )}
          </div>
          <span className="mt-0.5 text-[10px] leading-tight">Cart</span>
        </button>
      </nav>
    </div>
  );
}
