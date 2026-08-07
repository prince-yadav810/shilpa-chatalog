import { discountPercent, formatPrice } from "@/lib/pricing";

/**
 * The design system's signature element: monospace, right-aligned, tabular
 * figures, like a till receipt. Every price on the site renders through here
 * so the treatment can't drift between the grid, the detail page and the cart.
 *
 * The discount badge uses `accent` (ochre), never green — green means "this
 * button opens WhatsApp" and nothing else.
 */
export function Price({
  price,
  mrp,
  size = "md",
  align = "right",
}: {
  price: number;
  mrp?: number | null;
  size?: "sm" | "md" | "lg";
  align?: "left" | "right";
}) {
  const off = discountPercent(price, mrp);

  const priceSize =
    size === "lg" ? "text-2xl" : size === "sm" ? "text-caption" : "text-body";
  const mrpSize = size === "lg" ? "text-body" : "text-caption";

  return (
    <div
      className={`price flex flex-wrap items-baseline gap-x-2 gap-y-0.5 ${
        align === "right" ? "justify-end" : "justify-start"
      }`}
    >
      <span className={`${priceSize} font-medium text-ink`}>{formatPrice(price)}</span>
      {off !== null && mrp != null && (
        <>
          <span className={`${mrpSize} text-ink-muted line-through`}>
            {formatPrice(mrp)}
          </span>
          <span className={`${mrpSize} font-medium text-accent`}>{off}% off</span>
        </>
      )}
    </div>
  );
}
