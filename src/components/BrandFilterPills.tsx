import Link from "next/link";

/**
 * Each pill links to a real /brand/<brand>/<category> route rather than
 * appending ?brand=. That makes "Amul ice creams" a page with its own heading
 * and metadata that can be shared into a WhatsApp chat and indexed by search,
 * instead of a filter state that disappears when the link is copied.
 */
export function BrandFilterPills({
  brands,
  categorySlug,
  activeBrandSlug,
}: {
  brands: { name: string; slug: string; count: number }[];
  categorySlug: string;
  activeBrandSlug?: string;
}) {
  if (brands.length < 2) return null;

  return (
    <div className="mb-6">
      <h2 className="mb-2 text-caption uppercase tracking-wide text-ink-muted">
        Brands
      </h2>
      <ul className="flex flex-wrap gap-2">
        <li>
          <Link
            href={`/c/${categorySlug}`}
            aria-current={activeBrandSlug ? undefined : "page"}
            className={`block border px-3 py-1.5 text-caption ${
              activeBrandSlug
                ? "border-border bg-surface text-ink-muted hover:border-brand/40 hover:text-brand"
                : "border-brand bg-brand text-white"
            }`}
          >
            All
          </Link>
        </li>
        {brands.map((brand) => {
          const active = brand.slug === activeBrandSlug;
          return (
            <li key={brand.slug}>
              <Link
                href={`/brand/${brand.slug}/${categorySlug}`}
                aria-current={active ? "page" : undefined}
                className={`block border px-3 py-1.5 text-caption ${
                  active
                    ? "border-brand bg-brand text-white"
                    : "border-border bg-surface text-ink-muted hover:border-brand/40 hover:text-brand"
                }`}
              >
                {brand.name}{" "}
                <span className="price text-ink-muted/70">{brand.count}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
