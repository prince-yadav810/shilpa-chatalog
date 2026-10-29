import Link from "next/link";
import { HomepageSection } from "@prisma/client";
import {
  HomepageSectionManager,
  type HomepageControlItem,
} from "@/components/admin/HomepageSectionManager";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function statusSuffix(valid: boolean) {
  return valid ? "" : " · Needs attention before it can show";
}

export default async function AdminFeaturedPage() {
  const items = await prisma.homepageItem.findMany({
    orderBy: [{ section: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      category: {
        select: {
          id: true,
          name: true,
          imageUrl: true,
          isActive: true,
          parent: { select: { name: true, isActive: true } },
        },
      },
      product: {
        select: {
          id: true,
          name: true,
          imageUrl: true,
          variant: true,
          price: true,
          mrp: true,
          inStock: true,
          isArchived: true,
          brand: { select: { name: true } },
        },
      },
      brand: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
          isActive: true,
          products: { where: { isArchived: false }, select: { id: true }, take: 1 },
        },
      },
    },
  });

  const popularCategories: HomepageControlItem[] = items.flatMap((item) => {
    if (item.section !== HomepageSection.POPULAR_CATEGORIES || !item.category) return [];
    const category = item.category;
    const valid = category.isActive && Boolean(category.parent?.isActive);
    return [{
      id: item.id,
      targetId: category.id,
      title: category.name,
      detail: `${category.parent?.name ?? "No parent category"}${statusSuffix(valid)}`,
      imageUrl: category.imageUrl,
    }];
  });

  const popularProducts: HomepageControlItem[] = items.flatMap((item) => {
    if (item.section !== HomepageSection.POPULAR_PRODUCTS || !item.product) return [];
    const product = item.product;
    const valid = !product.isArchived && product.inStock;
    return [{
      id: item.id,
      targetId: product.id,
      title: product.name,
      detail: `${[product.brand?.name, product.variant].filter(Boolean).join(" · ") || "Product"}${statusSuffix(valid)}`,
      imageUrl: product.imageUrl,
    }];
  });

  const topOffers: HomepageControlItem[] = items.flatMap((item) => {
    if (item.section !== HomepageSection.TOP_OFFERS || !item.product) return [];
    const product = item.product;
    const valid = !product.isArchived && product.inStock && product.mrp != null && product.mrp > product.price;
    const percent = valid ? Math.round(((product.mrp! - product.price) / product.mrp!) * 100) : null;
    return [{
      id: item.id,
      targetId: product.id,
      title: product.name,
      detail: `${percent == null ? "No active offer" : `${percent}% off`}${product.brand ? ` · ${product.brand.name}` : ""}${statusSuffix(valid)}`,
      imageUrl: product.imageUrl,
    }];
  });

  const brands: HomepageControlItem[] = items.flatMap((item) => {
    if (item.section !== HomepageSection.BRANDS || !item.brand) return [];
    const brand = item.brand;
    const valid = brand.isActive && brand.products.length > 0;
    return [{
      id: item.id,
      targetId: brand.id,
      title: brand.name,
      detail: `Brand${statusSuffix(valid)}`,
      imageUrl: brand.logoUrl,
    }];
  });

  return (
    <>
      <div className="max-w-3xl">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#d45b18]">Storefront control</p>
        <h1 className="mt-1 font-heading text-section text-ink">Homepage</h1>
        <p className="mt-2 text-caption leading-relaxed text-ink-muted">
          Choose exactly what appears on the four homepage shelves and set the sequence with the arrows. Changes show on the shop right away.
          A shelf you leave empty continues to use its automatic selection.
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-[#f0ded2] bg-[#fff8f3] p-4 text-sm text-[#654239]">
          <strong className="block text-ink">12 items per shelf</strong>
          Keep the mobile homepage focused; add the strongest items first.
        </div>
        <div className="rounded-2xl border border-[#dceee2] bg-[#f4fbf6] p-4 text-sm text-[#3d624a]">
          <strong className="block text-[#17663a]">Offers stay honest</strong>
          Only in-stock products with a real MRP discount can appear in Top offers.
        </div>
      </div>

      <div className="mt-8 space-y-5">
        <HomepageSectionManager
          section="popularCategories"
          title="Popular categories"
          hint="Pick the subcategories customers should discover first. Their images come from the chosen subcategory."
          items={popularCategories}
        />
        <HomepageSectionManager
          section="popularProducts"
          title="Popular at Shilpa"
          hint="Choose your fast-moving or recommended products in the exact order they should appear."
          items={popularProducts}
        />
        <HomepageSectionManager
          section="topOffers"
          title="Top offers at Shilpa"
          hint="Select active offers and arrange them manually. The public Offers page still ranks every available offer by discount."
          items={topOffers}
        />
        <HomepageSectionManager
          section="brands"
          title="Brands we carry"
          hint="Choose the brands to feature on the homepage, independently of the full Brands page."
          items={brands}
        />
      </div>

      <p className="mt-6 text-caption text-ink-muted">
        Need to create or edit an item first? Visit <Link href="/admin/products" className="underline hover:text-brand">Products</Link>,{" "}
        <Link href="/admin/categories" className="underline hover:text-brand">Categories</Link>, or{" "}
        <Link href="/admin/brands" className="underline hover:text-brand">Brands</Link>.
      </p>
    </>
  );
}
