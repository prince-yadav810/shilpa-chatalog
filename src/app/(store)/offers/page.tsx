import type { Metadata } from "next";
import Link from "next/link";
import { BadgePercent, Sparkles } from "lucide-react";
import { getSettings } from "@/lib/settings";
import { getOfferPage } from "@/lib/offers";
import { parsePage } from "@/lib/queries";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { EmptyState, ProductGrid } from "@/components/ProductGrid";
import { Pagination } from "@/components/Pagination";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Offers",
  description: "Current Shilpa Chemist offers, ranked by percentage off.",
  alternates: { canonical: "/offers" },
};

type Props = { searchParams: Promise<{ page?: string }> };

export default async function OffersPage({ searchParams }: Props) {
  const { page: pageParam } = await searchParams;
  const page = parsePage(pageParam);
  const [settings, offers] = await Promise.all([getSettings(), getOfferPage(page)]);

  return (
    <>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Offers" }]} />

      <section className="mb-6 overflow-hidden rounded-[1.5rem] border border-[#f3cdc0] bg-[#fff0e8] px-5 py-5 sm:px-7 sm:py-7">
        <div className="flex max-w-xl items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e9252b] text-white shadow-[0_8px_16px_rgba(233,37,43,0.18)]">
            <BadgePercent size={21} strokeWidth={2.6} />
          </div>
          <div>
            <p className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.15em] text-[#bc352b]">
              <Sparkles size={12} /> Shilpa savings
            </p>
            <h1 className="mt-1 font-heading text-2xl font-semibold tracking-tight text-[#39231d] sm:text-3xl">
              Today&apos;s best offers
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-[#714b40]">
              Every product here has a current offer price. The biggest percentage-off savings come first.
            </p>
          </div>
        </div>
      </section>

      {offers.products.length === 0 ? (
        <EmptyState
          title="No offers are running right now."
          hint="New savings will appear here as soon as the shop adds them."
        >
          <Link href="/" className="btn-secondary">
            Browse the shop
          </Link>
        </EmptyState>
      ) : (
        <>
          <p className="mb-4 text-caption text-ink-muted">
            {offers.total} {offers.total === 1 ? "offer" : "offers"} available
          </p>
          <ProductGrid
            products={offers.products}
            whatsappNumber={settings.whatsappNumber}
            storeName={settings.storeName}
          />
          <Pagination page={page} totalPages={offers.totalPages} basePath="/offers" />
        </>
      )}
    </>
  );
}
