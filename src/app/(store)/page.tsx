import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  HeartPulse,
  Package,
  ShieldCheck,
  Sparkles,
  Truck,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { productCardSelect } from "@/lib/queries";
import { buildContactLink } from "@/lib/whatsapp";
import { EmptyState } from "@/components/ProductGrid";
import { HomeProductRail } from "@/components/home/HomeProductRail";

export const revalidate = 300;

type HomeCategory = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  children: { id: string; name: string; slug: string; imageUrl: string | null }[];
};

function findDepartment(categories: HomeCategory[], terms: string[]) {
  return categories.find((category) => terms.some((term) => category.slug.includes(term))) ?? categories[0];
}

export default async function HomePage() {
  const [settings, categories, featured, discountCandidates, fallbackProducts, brands] = await Promise.all([
    getSettings(),
    prisma.category.findMany({
      where: { parentId: null, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        imageUrl: true,
        children: {
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          select: { id: true, name: true, slug: true, imageUrl: true },
          take: 4,
        },
      },
    }),
    prisma.product.findMany({
      where: { isFeatured: true, isArchived: false },
      select: productCardSelect,
      orderBy: [{ featuredOrder: "asc" }, { name: "asc" }],
      take: 12,
    }),
    prisma.product.findMany({
      where: { isArchived: false, inStock: true, mrp: { not: null } },
      select: productCardSelect,
      orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
      take: 64,
    }),
    prisma.product.findMany({
      where: { isArchived: false, inStock: true },
      select: productCardSelect,
      orderBy: [{ isFeatured: "desc" }, { name: "asc" }],
      take: 12,
    }),
    prisma.brand.findMany({
      where: { isActive: true, products: { some: { isArchived: false } } },
      select: { id: true, name: true, slug: true, logoUrl: true },
      orderBy: { products: { _count: "desc" } },
      take: 12,
    }),
  ]);

  const deals = discountCandidates
    .filter((product) => product.mrp != null && product.mrp > product.price)
    .sort((first, second) => {
      const firstDiscount = (first.mrp! - first.price) / first.mrp!;
      const secondDiscount = (second.mrp! - second.price) / second.mrp!;
      return secondDiscount - firstDiscount;
    })
    .slice(0, 12);
  const hasCuratedPopularProducts = featured.length > 0;
  const popularProducts = hasCuratedPopularProducts
    ? featured
    : deals.length > 0
      ? deals
      : fallbackProducts;
  const popularSubcategories = categories
    .flatMap((parent) =>
      parent.children.slice(0, 2).map((child) => ({
        ...child,
        parentName: parent.name,
        parentSlug: parent.slug,
      })),
    )
    .slice(0, 12);
  const careDepartment = findDepartment(categories, ["medicine", "medical", "ayurveda"]);
  const dailyDepartment = findDepartment(categories, ["pantry", "household", "home-and-kitchen"]);
  const isEmpty = categories.length === 0 && popularProducts.length === 0;

  return (
    <div className="pb-2 sm:pb-8">
      {settings.promoBannerText && (
        <Link
          href={settings.promoBannerLink ?? "/"}
          className="mb-3 flex items-center justify-center gap-2 rounded-xl border border-[#ef2a2a]/15 bg-[#fff3ed] px-3 py-2 text-center text-xs font-semibold text-[#9f2d22] transition-colors hover:bg-[#ffe7db] sm:mb-5"
        >
          <Sparkles size={14} />
          {settings.promoBannerText}
        </Link>
      )}

      {categories.length > 0 && (
        <section aria-label="Shilpa highlights" className="-mx-2 overflow-hidden sm:mx-0">
          <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-2 pb-2 scrollbar-none sm:px-0">
            <Link
              href={careDepartment ? `/c/${careDepartment.slug}` : "/"}
              className="relative min-h-[176px] w-[88%] shrink-0 snap-start overflow-hidden rounded-[1.5rem] bg-[#fff0df] p-5 shadow-[0_12px_28px_rgba(239,87,31,0.13)] sm:w-[410px]"
            >
              <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-[#f57f17]/25" />
              <div className="absolute -bottom-10 right-4 h-32 w-32 rounded-full bg-[#e9252b]/12" />
              <div className="relative z-10 max-w-[64%]">
                <span className="inline-flex items-center gap-1 rounded-full bg-[#e9252b] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white">
                  <Truck size={12} strokeWidth={2.8} />
                  Free home delivery
                </span>
                <h1 className="mt-3 font-heading text-[1.72rem] font-semibold leading-[1.02] tracking-tight text-[#34201b] sm:text-3xl">
                  Care & essentials, close to home.
                </h1>
                <p className="font-marathi mt-2 text-sm font-semibold text-[#b72b23]">
                  आम्ही घेऊ तुमच्या आरोग्याची काळजी
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-extrabold text-[#9f2d22]">
                  Shop now <ArrowRight size={14} strokeWidth={2.8} />
                </span>
              </div>
              <Image
                src="/brand/shilpa-chemists-trust-seal.png"
                alt="Shilpa Chemist — genuine and authentic medicines"
                width={1254}
                height={1254}
                className="absolute bottom-3 right-3 h-24 w-24 rotate-6 object-contain drop-shadow-[0_8px_12px_rgba(127,28,22,0.24)] sm:h-28 sm:w-28"
                priority
              />
            </Link>

            <Link
              href={dailyDepartment ? `/c/${dailyDepartment.slug}` : "/"}
              className="relative min-h-[176px] w-[88%] shrink-0 snap-start overflow-hidden rounded-[1.5rem] bg-[#dff4e5] p-5 shadow-[0_12px_28px_rgba(5,128,72,0.13)] sm:w-[410px]"
            >
              <div className="relative z-10 max-w-[62%]">
                <span className="font-marathi text-xs font-bold text-[#087a42]">घरबसल्या ऑर्डर करा</span>
                <h2 className="mt-2 font-heading text-[1.65rem] font-semibold leading-[1.04] tracking-tight text-[#183c2a] sm:text-3xl">
                  Your everyday list, sorted.
                </h2>
                <p className="mt-2 text-xs font-medium leading-relaxed text-[#40705a]">
                  Pantry, personal care and home essentials in one place.
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-extrabold text-[#087a42]">
                  Explore essentials <ArrowRight size={14} strokeWidth={2.8} />
                </span>
              </div>
              {dailyDepartment?.imageUrl ? (
                <Image
                  src={dailyDepartment.imageUrl}
                  alt=""
                  fill
                  unoptimized
                  className="object-contain object-right-bottom p-2 pl-[44%] mix-blend-multiply"
                  sizes="(max-width: 640px) 88vw, 410px"
                />
              ) : (
                <HeartPulse className="absolute bottom-5 right-5 h-24 w-24 text-[#087a42]/20" />
              )}
            </Link>

            <a
              href={buildContactLink(settings.whatsappNumber, settings.storeName)}
              target="_blank"
              rel="noopener noreferrer"
              className="relative min-h-[176px] w-[88%] shrink-0 snap-start overflow-hidden rounded-[1.5rem] bg-[#ee2b2f] p-5 text-white shadow-[0_12px_28px_rgba(198,36,38,0.2)] sm:w-[410px]"
            >
              <BadgeCheck className="absolute -right-5 -top-5 h-32 w-32 text-white/15" strokeWidth={1} />
              <div className="relative z-10 max-w-[78%]">
                <span className="inline-flex rounded-full bg-white/18 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em]">
                  Shilpa promise
                </span>
                <h2 className="mt-3 font-heading text-[1.65rem] font-semibold leading-[1.04] tracking-tight">
                  Genuine products. Helpful people.
                </h2>
                <p className="mt-2 text-xs leading-relaxed text-white/80">Message us anytime and we&apos;ll help you find what you need.</p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-extrabold">
                  Chat on WhatsApp <ArrowRight size={14} strokeWidth={2.8} />
                </span>
              </div>
            </a>
          </div>
        </section>
      )}

      {isEmpty && (
        <div className="mt-8">
          <EmptyState title="The catalog is being set up." hint="Products will appear here as soon as they&apos;re added." />
        </div>
      )}

      {categories.length > 0 && (
        <section aria-labelledby="departments-title" className="mt-8 sm:mt-10">
          <div className="mb-3 flex items-end justify-between px-1">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#d45b18]">Browse by need</p>
              <h2 id="departments-title" className="mt-0.5 font-heading text-xl font-semibold text-ink sm:text-2xl">
                Shop by department
              </h2>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {categories.slice(0, 12).map((category) => (
              <Link
                key={category.id}
                href={`/c/${category.slug}`}
                className="group relative min-h-[154px] overflow-hidden rounded-2xl border border-[#f1e2d8] bg-[#fffdfb] p-3 shadow-[0_5px_18px_rgba(105,65,38,0.07)] transition duration-200 hover:-translate-y-0.5 hover:border-[#ef2a2a]/35 hover:shadow-[0_10px_22px_rgba(105,65,38,0.12)]"
              >
                <div className="absolute inset-x-0 top-0 h-[108px] bg-gradient-to-b from-[#fff5e8] to-transparent" />
                <div className="relative h-[104px] overflow-hidden rounded-xl">
                  {category.imageUrl ? (
                    <Image
                      src={category.imageUrl}
                      alt={category.name}
                      fill
                      unoptimized
                      className="object-contain p-1 transition-transform duration-300 group-hover:scale-110"
                      sizes="(max-width: 640px) 44vw, 180px"
                    />
                  ) : (
                    <Package className="mx-auto mt-8 text-[#e8cfc1]" aria-hidden="true" />
                  )}
                </div>
                <div className="relative mt-1.5 flex items-center justify-between gap-1">
                  <h3 className="line-clamp-2 text-xs font-extrabold leading-tight text-ink">{category.name}</h3>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#d84b2f] transition-transform group-hover:translate-x-0.5" strokeWidth={2.8} />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {popularSubcategories.length > 0 && (
        <section aria-labelledby="popular-categories-title" className="mt-9 rounded-[1.75rem] bg-[#fff0e5] px-3 py-5 sm:mt-12 sm:px-5 sm:py-6">
          <div className="mb-4 px-1">
            <p className="font-marathi text-xs font-bold text-[#bf3929]">तुमच्यासाठी निवडलेले</p>
            <h2 id="popular-categories-title" className="mt-0.5 font-heading text-xl font-semibold text-[#39231d] sm:text-2xl">
              Popular categories
            </h2>
          </div>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
            {popularSubcategories.map((category) => (
              <Link
                key={category.id}
                href={`/c/${category.parentSlug}/${category.slug}`}
                className="group min-w-0 text-center"
                title={`${category.parentName} — ${category.name}`}
              >
                <div className="relative aspect-square overflow-hidden rounded-2xl border border-white/80 bg-white shadow-[0_5px_14px_rgba(118,61,29,0.09)] transition-transform duration-200 group-hover:-translate-y-0.5">
                  {category.imageUrl ? (
                    <Image
                      src={category.imageUrl}
                      alt=""
                      fill
                      unoptimized
                      className="object-contain p-1"
                      sizes="(max-width: 640px) 23vw, 130px"
                    />
                  ) : (
                    <Package className="absolute inset-0 m-auto text-[#ebd6ca]" size={24} aria-hidden="true" />
                  )}
                </div>
                <span className="mt-1.5 block line-clamp-2 text-[10px] font-bold leading-tight text-[#543d32] sm:text-xs">
                  {category.name}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <HomeProductRail
        id="popular-products"
        title={hasCuratedPopularProducts ? "Popular at Shilpa" : "Explore Shilpa"}
        description={
          hasCuratedPopularProducts
            ? "Quick-add essentials chosen by the shop."
            : "A few useful things to get your list started."
        }
        products={popularProducts}
      />

      <HomeProductRail
        id="offers"
        title="Real savings, every day"
        description="Products with a genuine offer price."
        products={deals}
      />

      {brands.length > 0 && (
        <section aria-labelledby="brands-title" className="mt-9 sm:mt-12">
          <div className="mb-3 flex items-end justify-between gap-4 px-1">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#d45b18]">Names you know</p>
              <h2 id="brands-title" className="mt-0.5 font-heading text-xl font-semibold text-ink sm:text-2xl">
                Brands we carry
              </h2>
            </div>
            <Link href="/brands" className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-brand hover:underline">
              All brands <ArrowRight size={14} strokeWidth={2.5} />
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {brands.map((brand) => (
              <Link
                key={brand.id}
                href={`/brand/${brand.slug}`}
                className="group flex min-h-[76px] flex-col items-center justify-center rounded-2xl border border-border/75 bg-surface px-2 py-3 text-center shadow-[0_4px_13px_rgba(60,45,34,0.05)] transition hover:-translate-y-0.5 hover:border-[#ef2a2a]/30"
              >
                {brand.logoUrl ? (
                  <Image
                    src={brand.logoUrl}
                    alt={brand.name}
                    width={120}
                    height={40}
                    unoptimized
                    className="h-8 w-full object-contain"
                  />
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#fff0e5] text-xs font-black text-[#d94d31]">
                    {brand.name.slice(0, 1)}
                  </span>
                )}
                <span className="mt-1.5 line-clamp-1 text-[10px] font-bold text-ink-muted group-hover:text-brand">{brand.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-10 overflow-hidden rounded-[1.75rem] border border-[#e9d8ce] bg-[#fffdfb] px-4 py-5 shadow-[0_10px_28px_rgba(96,59,33,0.07)] sm:mt-14 sm:flex sm:items-center sm:justify-between sm:px-8">
        <div className="max-w-md">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#e5f5e9] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#087a42]">
            <ShieldCheck size={13} strokeWidth={2.8} />
            Shilpa promise
          </div>
          <h2 className="mt-3 font-heading text-2xl font-semibold leading-tight text-[#30221e] sm:text-3xl">
            Your neighbourhood chemist, in your pocket.
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            Genuine products, helpful guidance, and free home delivery on every order.
          </p>
          <a
            href={buildContactLink(settings.whatsappNumber, settings.storeName)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#07954d] px-4 py-2.5 text-sm font-bold text-white shadow-[0_8px_18px_rgba(7,149,77,0.2)] transition hover:bg-[#067d40]"
          >
            <Truck size={17} strokeWidth={2.7} />
            Free delivery on WhatsApp
          </a>
        </div>
        <Image
          src="/brand/shilpa-chemists-promo-lockup.png"
          alt="Shilpa Chemist — we care for your health, with free home delivery"
          width={1451}
          height={1084}
          className="mx-auto mt-4 h-auto w-full max-w-[255px] object-contain sm:mt-0 sm:max-w-[285px]"
        />
      </section>
    </div>
  );
}
