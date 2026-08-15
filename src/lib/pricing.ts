/**
 * `price` is what the customer pays. `mrp` is the printed maximum retail
 * price, and is only ever set when a real source states one — the demo
 * fabricated random 10-40% markups on real products to make the UI look
 * livelier, which is exactly what this module exists to prevent.
 */

export function discountPercent(price: number, mrp?: number | null): number | null {
  if (mrp == null || !Number.isFinite(mrp) || mrp <= price) return null;
  const pct = Math.round(((mrp - price) / mrp) * 100);
  // Sub-1% "discounts" are rounding noise, not an offer worth a badge.
  return pct >= 1 ? pct : null;
}

export function hasOffer(price: number, mrp?: number | null): boolean {
  return discountPercent(price, mrp) !== null;
}

/** Display form for the signature monospace price treatment. */
export function formatPrice(amount: number | null | undefined): string {
  if (amount == null || typeof amount !== "number" || isNaN(amount)) {
    return "₹0.00";
  }
  return `₹${amount.toFixed(2)}`;
}
