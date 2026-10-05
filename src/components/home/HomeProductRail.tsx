import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProductCard, type ProductCardData } from "@/components/ProductCard";

/**
 * A touch-first product shelf. It deliberately keeps the product card and its
 * quick-add control identical everywhere, while borrowing the quick-commerce
 * habit of showing the next card peeking in from the edge.
 */
export function HomeProductRail({
  id,
  title,
  description,
  products,
  href,
  linkLabel = "See all",
}: {
  id: string;
  title: string;
  description?: string;
  products: ProductCardData[];
  href?: string;
  linkLabel?: string;
}) {
  if (products.length === 0) return null;

  return (
    <section aria-labelledby={`${id}-title`} className="mt-9 sm:mt-12">
      <div className="mb-3 flex items-end justify-between gap-4 px-1">
        <div>
          <h2 id={`${id}-title`} className="font-heading text-xl font-semibold text-ink sm:text-2xl">
            {title}
          </h2>
          {description && <p className="mt-0.5 text-xs text-ink-muted sm:text-sm">{description}</p>}
        </div>
        {href && (
          <Link
            href={href}
            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand/8 px-3 py-1.5 text-xs font-bold text-brand transition-colors hover:bg-brand hover:text-white"
          >
            {linkLabel}
            <ArrowRight size={14} strokeWidth={2.5} />
          </Link>
        )}
      </div>

      <div className="-mx-2 flex snap-x snap-mandatory gap-3 overflow-x-auto px-2 pb-2 scrollbar-none sm:-mx-4 sm:px-4">
        {products.map((product) => (
          <div key={product.id} className="w-[154px] shrink-0 snap-start sm:w-[188px]">
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  );
}
