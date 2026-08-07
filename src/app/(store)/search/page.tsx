import type { Metadata } from "next";
import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { listProducts, parsePage } from "@/lib/queries";
import { ProductGrid, EmptyState } from "@/components/ProductGrid";
import { Pagination } from "@/components/Pagination";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Search",
  // Search result pages have no standalone value in an index.
  robots: { index: false, follow: true },
};

type Props = { searchParams: Promise<{ q?: string; page?: string }> };

export default async function SearchPage({ searchParams }: Props) {
  const { q, page: pageParam } = await searchParams;
  const query = (q ?? "").trim();
  const page = parsePage(pageParam);
  const settings = await getSettings();

  if (!query) {
    return (
      <>
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Search" }]} />
        <EmptyState
          title="Type something to search for."
          hint="Search by product name, brand, or pack size."
        />
      </>
    );
  }

  /*
   * `mode: "insensitive"` is a real Postgres ILIKE. The demo ran this on
   * SQLite, where `contains` is case-sensitive for anything non-ASCII.
   */
  const { products, total, totalPages } = await listProducts(
    {
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { variant: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
        { brand: { name: { contains: query, mode: "insensitive" } } },
        { category: { name: { contains: query, mode: "insensitive" } } },
      ],
    },
    page,
  );

  return (
    <>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Search" }]} />

      <header className="mb-6">
        <h1 className="font-heading text-section text-ink">
          {total} {total === 1 ? "result" : "results"} for “{query}”
        </h1>
      </header>

      {products.length === 0 ? (
        <EmptyState
          title={`Nothing matched “${query}”.`}
          hint="Try a shorter search, or a brand name. If we don't list it, the shop may still be able to order it in."
        >
          <Link href="/" className="btn-secondary">
            Browse categories
          </Link>
        </EmptyState>
      ) : (
        <>
          <ProductGrid
            products={products}
            whatsappNumber={settings.whatsappNumber}
            storeName={settings.storeName}
          />
          <Pagination
            page={page}
            totalPages={totalPages}
            basePath="/search"
            params={{ q: query }}
          />
        </>
      )}
    </>
  );
}
