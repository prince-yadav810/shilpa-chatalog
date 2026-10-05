"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Archive, ArrowLeft, Package, Plus, Store } from "lucide-react";
import { CategorySidebar, type SidebarCategoryItem } from "@/components/CategorySidebar";
import type { CategoryOption } from "@/components/admin/ProductForm";
import { AdminProductSection } from "@/components/admin/AdminProductSection";

export type AdminCatalogCategory = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  children: {
    id: string;
    name: string;
    slug: string;
    imageUrl: string | null;
  }[];
};

export function AdminCatalogBrowser({
  categories,
  leafCategories,
  archived,
  initialCategorySlug,
  activeCount,
  archivedCount,
}: {
  categories: AdminCatalogCategory[];
  leafCategories: CategoryOption[];
  archived: boolean;
  initialCategorySlug?: string;
  activeCount: number;
  archivedCount: number;
}) {
  const selectedCategory = initialCategorySlug
    ? categories.find((category) => category.slug === initialCategorySlug)
    : undefined;
  const basePath = archived ? "/admin/products/archived" : "/admin/products";
  const otherPath = archived ? "/admin/products" : "/admin/products/archived";

  if (!selectedCategory) {
    return (
      <>
        <CatalogHeader
          archived={archived}
          activeCount={activeCount}
          archivedCount={archivedCount}
          otherPath={otherPath}
        />

        {archived && <ArchiveNotice />}

        {categories.length === 0 ? (
          <div className="mt-8 border border-border bg-surface px-6 py-12 text-center text-body text-ink-muted">
            No categories have been created yet. Add a category before adding products.
          </div>
        ) : (
          <section className="mt-7 sm:mt-8">
            <div className="mb-4 flex items-baseline justify-between gap-4">
              <div>
                <h2 className="font-heading text-lg font-bold text-ink sm:text-xl">
                  Browse by category
                </h2>
                <p className="mt-1 text-caption text-ink-muted">
                  Choose a category to manage its products and subcategories.
                </p>
              </div>
              {!archived && (
                <Link href="/admin/products/new" className="btn-primary shrink-0">
                  <Plus size={16} />
                  Add product
                </Link>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`${basePath}?category=${encodeURIComponent(category.slug)}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-surface p-3 shadow-xs transition-all hover:border-brand/40 hover:shadow-md"
                >
                  <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl bg-background/50 p-1">
                    {category.imageUrl ? (
                      <Image
                        src={category.imageUrl}
                        alt={category.name}
                        fill
                        className="object-contain p-1 transition-transform duration-300 group-hover:scale-110"
                        sizes="(max-width: 640px) 45vw, 25vw"
                        unoptimized
                      />
                    ) : (
                      <Package size={36} className="text-border" aria-hidden="true" />
                    )}
                  </div>
                  <div className="mt-3 text-center">
                    <h3 className="text-xs font-bold text-ink sm:text-sm">{category.name}</h3>
                    {category.children.length > 0 && (
                      <p className="mt-1 line-clamp-2 text-[10px] text-ink-muted sm:text-[11px]">
                        {category.children.map((child) => child.name).join(" · ")}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </>
    );
  }

  return (
    <AdminCategoryShelf
      category={selectedCategory}
      categories={leafCategories}
      archived={archived}
      basePath={basePath}
      activeCount={activeCount}
      archivedCount={archivedCount}
      otherPath={otherPath}
    />
  );
}

function CatalogHeader({
  archived,
  activeCount,
  archivedCount,
  otherPath,
}: {
  archived: boolean;
  activeCount: number;
  archivedCount: number;
  otherPath: string;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
      <div>
        <p className="text-caption font-medium uppercase tracking-[0.14em] text-ink-muted">Catalog manager</p>
        <h1 className="mt-1 font-heading text-section text-ink">
          {archived ? "Archived products" : "Products"}
        </h1>
        <p className="mt-1 max-w-xl text-caption text-ink-muted">
          {archived
            ? "Browse archived stock by category. Restore, move, edit, or permanently delete it from each card."
            : "Browse the catalog as customers do, with product management kept on each card."}
        </p>
      </div>
      <Link href={otherPath} className="btn-secondary shrink-0">
        {archived ? <Store size={16} /> : <Archive size={16} />}
        {archived ? `Active products (${activeCount})` : `Archived (${archivedCount})`}
      </Link>
    </header>
  );
}

function AdminCategoryShelf({
  category,
  categories,
  archived,
  basePath,
  activeCount,
  archivedCount,
  otherPath,
}: {
  category: AdminCatalogCategory;
  categories: CategoryOption[];
  archived: boolean;
  basePath: string;
  activeCount: number;
  archivedCount: number;
  otherPath: string;
}) {
  const sections = category.children.length > 0 ? category.children : [category];
  const [activeSlug, setActiveSlug] = useState(sections[0]?.slug ?? "all");
  const [productCounts, setProductCounts] = useState<Record<string, number>>({});
  const isUserScrolling = useRef(false);
  const scrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLoaded = useCallback((categoryId: string, total: number) => {
    setProductCounts((current) =>
      current[categoryId] === total ? current : { ...current, [categoryId]: total },
    );
  }, []);

  const scrollToSubcategory = useCallback((slug: string) => {
    isUserScrolling.current = true;
    setActiveSlug(slug);

    if (slug === "all") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      const target = document.getElementById(`admin-shelf-${slug}`);
      if (target) {
        window.scrollTo({
          top: target.getBoundingClientRect().top + window.scrollY - 72,
          behavior: "smooth",
        });
      }
    }

    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      isUserScrolling.current = false;
    }, 800);
  }, []);

  useEffect(() => {
    if (category.children.length === 0) return;
    const sectionNodes = document.querySelectorAll<HTMLElement>("[data-admin-subcategory]");
    const observer = new IntersectionObserver(
      (entries) => {
        if (isUserScrolling.current) return;
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) =>
              Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top),
          );
        const slug = visible[0]?.target.getAttribute("data-admin-subcategory");
        if (slug) setActiveSlug(slug);
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: [0, 0.2, 0.5] },
    );
    sectionNodes.forEach((section) => observer.observe(section));

    return () => {
      observer.disconnect();
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    };
  }, [category.children.length]);

  const sidebarItems: SidebarCategoryItem[] = category.children.map((child) => ({
    ...child,
    productCount: productCounts[child.id] ?? 0,
  }));
  const totalCount = Object.values(productCounts).reduce((sum, count) => sum + count, 0);

  return (
    <div className="-mx-4 -mt-8">
      <header className="border-b border-border bg-background px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <Link
              href={basePath}
              className="inline-flex items-center gap-1 text-caption text-ink-muted hover:text-brand"
            >
              <ArrowLeft size={15} />
              All categories
            </Link>
            <h1 className="mt-1 font-heading text-section text-ink">{category.name}</h1>
            <p className="mt-0.5 text-caption text-ink-muted">
              {totalCount > 0
                ? `${totalCount} ${totalCount === 1 ? "product" : "products"} shown`
                : archived
                  ? "Archived catalog"
                  : "Active catalog"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!archived && (
              <Link href="/admin/products/new" className="btn-primary py-2 text-xs">
                <Plus size={15} />
                Add product
              </Link>
            )}
            <Link href={otherPath} className="btn-secondary py-2 text-xs">
              {archived ? <Store size={15} /> : <Archive size={15} />}
              {archived ? `Active (${activeCount})` : `Archived (${archivedCount})`}
            </Link>
          </div>
        </div>
        {archived && <ArchiveNotice compact />}
      </header>

      <div className="flex min-h-[calc(100vh-7.5rem)]">
        {category.children.length > 0 && (
          <CategorySidebar
            parentCategory={category}
            subcategories={sidebarItems}
            activeSubcategorySlug={activeSlug}
            onSelectSubcategory={scrollToSubcategory}
          />
        )}

        <div className="min-w-0 flex-1 px-2.5 py-4 sm:px-5 sm:py-5">
          <div className="space-y-6 sm:space-y-8">
            {sections.map((section) => (
              <section
                key={section.id}
                id={`admin-shelf-${section.slug}`}
                data-admin-subcategory={section.slug}
                className="scroll-mt-20"
              >
                {category.children.length > 0 && (
                  <div className="sticky top-[57px] z-10 -mx-2.5 mb-2.5 border-b border-border/70 bg-surface/95 px-2.5 py-2 backdrop-blur shadow-2xs sm:-mx-5 sm:px-5">
                    <div className="flex items-baseline justify-between">
                      <h2 className="font-heading text-sm font-bold text-ink sm:text-base">{section.name}</h2>
                      {(productCounts[section.id] ?? 0) > 0 && (
                        <span className="text-[11px] font-medium text-ink-muted">
                          {productCounts[section.id]} {productCounts[section.id] === 1 ? "item" : "items"}
                        </span>
                      )}
                    </div>
                  </div>
                )}
                <AdminProductSection
                  categoryId={section.id}
                  archived={archived}
                  categories={categories}
                  onLoaded={(total) => handleLoaded(section.id, total)}
                />
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ArchiveNotice({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`${compact ? "mt-3" : "mt-6"} flex items-start gap-2 border border-amber-300/70 bg-amber-500/10 px-3 py-2.5 text-caption text-amber-950`}
    >
      <Archive size={15} className="mt-0.5 shrink-0" />
      <p>
        Archived products are hidden from the storefront. Restore them when ready, or permanently delete only after checking the warning.
      </p>
    </div>
  );
}
