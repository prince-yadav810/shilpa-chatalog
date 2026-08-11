"use client";

import Link from "next/link";
import Image from "next/image";
import { Package, Grid } from "lucide-react";

export type SidebarCategoryItem = {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string | null;
  productCount?: number;
};

export function CategorySidebar({
  parentCategory,
  subcategories,
  activeSubcategorySlug,
}: {
  parentCategory: { name: string; slug: string; imageUrl?: string | null };
  subcategories: SidebarCategoryItem[];
  activeSubcategorySlug?: string;
}) {
  const isAllActive = !activeSubcategorySlug;

  return (
    <aside className="sticky top-[165px] sm:top-[155px] z-20 flex h-[calc(100vh-10.5rem)] w-24 shrink-0 flex-col border-r border-border/80 bg-surface/95 backdrop-blur sm:w-28 md:w-60">
      {/* Header Label for Desktop */}
      <div className="hidden border-b border-border/60 p-3.5 md:block">
        <h2 className="font-heading text-base font-bold text-ink line-clamp-1">
          {parentCategory.name}
        </h2>
        <p className="text-xs text-ink-muted">{subcategories.length} subcategories</p>
      </div>

      {/* Scrollable Subcategory Item List */}
      <nav aria-label="Subcategories Sidebar" className="flex-1 overflow-y-auto py-2 scrollbar-thin">
        <div className="flex flex-col gap-2.5 px-2">
          {/* "All <Parent>" Item */}
          <Link
            href={`/c/${parentCategory.slug}`}
            className={`group relative flex flex-col items-center justify-center rounded-2xl p-2 text-center transition-all ${
              isAllActive
                ? "bg-brand/10 text-brand font-bold shadow-xs ring-2 ring-brand/30"
                : "text-ink-muted hover:bg-background hover:text-ink"
            }`}
          >
            <div
              className={`relative flex h-15 w-15 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 transition-transform group-hover:scale-110 sm:h-18 sm:w-18 ${
                isAllActive ? "border-brand bg-surface shadow-xs" : "border-border bg-background"
              }`}
            >
              {parentCategory.imageUrl ? (
                <Image
                  src={parentCategory.imageUrl}
                  alt="All"
                  fill
                  className="object-cover scale-135"
                  sizes="72px"
                />
              ) : (
                <Grid size={24} className={isAllActive ? "text-brand" : "text-ink-muted"} />
              )}
            </div>
            <span className="mt-1.5 line-clamp-2 text-xs font-bold leading-tight sm:text-xs">
              All {parentCategory.name.split(" ")[0]}
            </span>
            {isAllActive && (
              <span className="absolute left-0 top-1/2 h-8 w-1.5 -translate-y-1/2 rounded-r-full bg-brand" />
            )}
          </Link>

          {/* Subcategory List Items (Super Zoomed Thumbnails) */}
          {subcategories.map((subcat) => {
            const isActive = activeSubcategorySlug === subcat.slug;
            return (
              <Link
                key={subcat.id}
                href={`/c/${parentCategory.slug}/${subcat.slug}`}
                className={`group relative flex flex-col items-center justify-center rounded-2xl p-2 text-center transition-all ${
                  isActive
                    ? "bg-brand/10 text-brand font-bold shadow-xs ring-2 ring-brand/30"
                    : "text-ink-muted hover:bg-background hover:text-ink"
                }`}
              >
                <div
                  className={`relative flex h-15 w-15 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 transition-transform group-hover:scale-110 sm:h-18 sm:w-18 ${
                    isActive ? "border-brand bg-surface shadow-xs" : "border-border bg-background"
                  }`}
                >
                  {subcat.imageUrl ? (
                    <Image
                      src={subcat.imageUrl}
                      alt={subcat.name}
                      fill
                      className="object-cover scale-135"
                      sizes="72px"
                    />
                  ) : (
                    <Package size={22} className={isActive ? "text-brand" : "text-border"} />
                  )}
                </div>
                <span className="mt-1.5 line-clamp-2 text-xs font-bold leading-tight sm:text-xs">
                  {subcat.name}
                </span>
                {isActive && (
                  <span className="absolute left-0 top-1/2 h-8 w-1.5 -translate-y-1/2 rounded-r-full bg-brand" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
