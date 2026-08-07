"use client";

import { Minus, Plus } from "lucide-react";
import { useCart, type CartItem } from "@/context/CartContext";

export function AddToOrderButton({ product }: { product: Omit<CartItem, "quantity"> }) {
  const { items, addItem, updateQuantity, openCart } = useCart();
  const inCart = items.find((i) => i.id === product.id);

  if (!inCart) {
    return (
      <button onClick={() => addItem(product)} className="btn-secondary w-full py-3">
        Add to order
      </button>
    );
  }

  return (
    <div className="flex items-center justify-between border border-border">
      <button
        onClick={() => updateQuantity(product.id, inCart.quantity - 1)}
        aria-label="Remove one"
        className="flex h-12 w-12 items-center justify-center text-ink-muted hover:bg-background hover:text-ink"
      >
        <Minus size={16} />
      </button>
      <button
        onClick={openCart}
        className="price flex-1 text-center text-body font-medium text-brand"
      >
        {inCart.quantity} in your order
      </button>
      <button
        onClick={() => updateQuantity(product.id, inCart.quantity + 1)}
        aria-label="Add one more"
        className="flex h-12 w-12 items-center justify-center text-ink-muted hover:bg-background hover:text-ink"
      >
        <Plus size={16} />
      </button>
    </div>
  );
}
