/**
 * The single source of truth for WhatsApp order links.
 *
 * The demo re-declared the number and rebuilt this URL in four separate files,
 * which is how the `+91` display formatting ended up hardcoded in one of them.
 * Everything that opens WhatsApp goes through here.
 */

export type OrderableProduct = {
  name: string;
  variant?: string | null;
  price: number;
};

export type OrderableLine = OrderableProduct & { quantity: number };

function rupees(amount: number): string {
  return `₹${amount.toFixed(2)}`;
}

function line(item: OrderableProduct): string {
  return `${item.name}${item.variant ? ` (${item.variant})` : ""} — ${rupees(item.price)}`;
}

function waLink(number: string, message: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function buildProductOrderLink(
  product: OrderableProduct,
  number: string,
  storeName = "Shilpa",
): string {
  const message = `Hi ${storeName}, I'd like to order:\n\n${line(product)}\nQuantity: ___`;
  return waLink(number, message);
}

export function buildCartOrderLink(
  items: OrderableLine[],
  number: string,
  storeName = "Shilpa",
): string {
  const lines = items
    .map((item) => `• ${line(item)} × ${item.quantity}`)
    .join("\n");
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const message = `Hi ${storeName}, I'd like to order:\n\n${lines}\n\nTotal: ${rupees(
    total,
  )}\n\nPlease confirm availability.`;
  return waLink(number, message);
}

/** Plain "start a chat" link, with no order attached. */
export function buildContactLink(number: string, storeName = "Shilpa"): string {
  return waLink(number, `Hi ${storeName}, I have a question.`);
}

/**
 * Format a stored E.164-without-plus number for display: 918591442334
 * becomes +91 85914 42334. Falls back to a bare +prefix for non-Indian
 * numbers rather than mangling them.
 */
export function formatDisplayNumber(number: string): string {
  const digits = number.replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length === 12) {
    const local = digits.slice(2);
    return `+91 ${local.slice(0, 5)} ${local.slice(5)}`;
  }
  return `+${digits}`;
}

/** Normalise admin input ("+91 85914 42334", "085914-42334") to storage form. */
export function normaliseNumber(input: string): string {
  let digits = input.replace(/\D/g, "");
  if (digits.length === 10) digits = `91${digits}`; // bare Indian mobile
  if (digits.length === 11 && digits.startsWith("0")) digits = `91${digits.slice(1)}`;
  return digits;
}
