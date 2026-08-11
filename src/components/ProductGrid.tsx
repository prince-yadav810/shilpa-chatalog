import { ProductCard, type ProductCardData } from "@/components/ProductCard";

export function ProductGrid({
  products,
  whatsappNumber,
  storeName,
}: {
  products: ProductCardData[];
  whatsappNumber: string;
  storeName: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          whatsappNumber={whatsappNumber}
          storeName={storeName}
        />
      ))}
    </div>
  );
}

/**
 * Empty states say what happened and suggest a next step, rather than "No
 * data" (DESIGN_SYSTEM.md §Voice & copy).
 */
export function EmptyState({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="border border-border bg-surface px-6 py-16 text-center">
      <p className="text-body text-ink">{title}</p>
      {hint && <p className="mx-auto mt-2 max-w-md text-caption text-ink-muted">{hint}</p>}
      {children && <div className="mt-4 flex justify-center gap-2">{children}</div>}
    </div>
  );
}
