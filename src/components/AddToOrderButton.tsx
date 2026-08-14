"use client";

import { Minus, Plus, ShoppingBag } from "lucide-react";
import { useCart, type CartItem } from "@/context/CartContext";

export function AddToOrderButton({ product }: { product: Omit<CartItem, "quantity"> }) {
  const { items, addItem, updateQuantity, openCart } = useCart();
  const inCart = items.find((i) => i.id === product.id);

  if (!inCart) {
    return (
      <button
        onClick={() => addItem(product)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-emerald-600 bg-emerald-50 py-3 text-sm font-bold text-emerald-700 shadow-2xs transition-all hover:bg-emerald-600 hover:text-white active:scale-98"
      >
        <ShoppingBag size={18} />
        Add to order
      </button>
    );
  }

  return (
    <div className="flex h-12 w-full items-center justify-between rounded-xl border-2 border-brand bg-brand/5 shadow-2xs">
      <button
        onClick={() => updateQuantity(product.id, inCart.quantity - 1)}
        aria-label="Remove one"
        className="flex h-12 w-12 items-center justify-center text-brand hover:bg-brand/10 active:scale-90 transition-transform"
      >
        <Minus size={18} className="stroke-[2.5]" />
      </button>
      <button
        onClick={openCart}
        className="price flex-1 text-center text-sm font-extrabold text-brand"
      >
        {inCart.quantity} in order · View Cart
      </button>
      <button
        onClick={() => updateQuantity(product.id, inCart.quantity + 1)}
        aria-label="Add one more"
        className="flex h-12 w-12 items-center justify-center text-brand hover:bg-brand/10 active:scale-90 transition-transform"
      >
        <Plus size={18} className="stroke-[2.5]" />
      </button>
    </div>
  );
}
