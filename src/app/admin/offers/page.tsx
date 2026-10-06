import Link from "next/link";
import Image from "next/image";
import { BadgePercent, Pencil } from "lucide-react";
import { getOfferPage } from "@/lib/offers";
import { parsePage } from "@/lib/queries";
import { discountPercent, formatPrice } from "@/lib/pricing";
import { Pagination } from "@/components/Pagination";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ page?: string }> };

export default async function AdminOffersPage({ searchParams }: Props) {
  const { page: pageParam } = await searchParams;
  const page = parsePage(pageParam);
  const offers = await getOfferPage(page);

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-section text-ink">Offers</h1>
          <p className="mt-2 max-w-2xl text-caption text-ink-muted">
            Products are ranked on the shop by percentage off. To add or change an offer, edit a product and use
            its <strong className="text-ink">Offer discount (%)</strong> field. It calculates the selling price
            from the genuine MRP.
          </p>
        </div>
        <Link href="/admin/products" className="btn-secondary">
          Manage products
        </Link>
      </div>

      {offers.products.length === 0 ? (
        <div className="mt-6 border border-border bg-surface px-6 py-12 text-center">
          <BadgePercent className="mx-auto text-ink-muted" size={28} />
          <p className="mt-3 text-body text-ink">No active offers yet.</p>
          <p className="mt-1 text-caption text-ink-muted">Add a discount to any in-stock product to show it here and on the shop.</p>
        </div>
      ) : (
        <>
          <p className="mt-6 text-caption text-ink-muted">
            {offers.total} active {offers.total === 1 ? "offer" : "offers"}
          </p>
          <ul className="mt-3 overflow-hidden border border-border bg-surface">
            {offers.products.map((product) => {
              const percent = discountPercent(product.price, product.mrp);
              return (
                <li key={product.id} className="flex items-center gap-3 border-b border-border px-3 py-3 last:border-0 sm:px-4">
                  <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden bg-background">
                    {product.imageUrl ? (
                      <Image src={product.imageUrl} alt="" fill unoptimized sizes="48px" className="object-contain p-1" />
                    ) : (
                      <BadgePercent size={18} className="text-ink-muted" aria-hidden="true" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body font-medium text-ink">{product.name}</p>
                    <p className="mt-0.5 text-caption text-ink-muted">
                      {formatPrice(product.price)} <span className="line-through">{formatPrice(product.mrp)}</span>
                    </p>
                  </div>
                  {percent !== null && (
                    <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-1 text-caption font-bold text-emerald-700">
                      {percent}% off
                    </span>
                  )}
                  <Link
                    href={`/admin/products/${product.id}/edit`}
                    className="inline-flex shrink-0 items-center gap-1 text-caption font-medium text-brand hover:underline"
                  >
                    <Pencil size={13} /> Edit
                  </Link>
                </li>
              );
            })}
          </ul>
          <Pagination page={page} totalPages={offers.totalPages} basePath="/admin/offers" />
        </>
      )}
    </>
  );
}
