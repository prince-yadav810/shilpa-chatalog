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
    <aside className="sticky top-16 z-20 flex h-[calc(100vh-4rem)] w-20 shrink-0 flex-col border-r border-border/80 bg-surface/95 backdrop-blur sm:w-24 md:w-56">
      {/* Header Label for Desktop */}
      <div className="hidden border-b border-border/60 p-3.5 md:block">
        <h2 className="font-heading text-sm font-semibold text-ink line-clamp-1">
          {parentCategory.name}
        </h2>
        <p className="text-[11px] text-ink-muted">{subcategories.length} subcategories</p>
      </div>

      {/* Scrollable Subcategory Item List */}
      <nav aria-label="Subcategories Sidebar" className="flex-1 overflow-y-auto py-2 scrollbar-thin">
        <div className="flex flex-col gap-1.5 px-1.5 sm:px-2">
          {/* "All <Parent>" Item */}
          <Link
            href={`/c/${parentCategory.slug}`}
            className={`group relative flex flex-col items-center justify-center rounded-xl p-2 text-center transition-all ${
              isAllActive
                ? "bg-brand/10 text-brand font-semibold shadow-xs ring-1 ring-brand/30"
                : "text-ink-muted hover:bg-background hover:text-ink"
            }`}
          >
            <div
              className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-transform group-hover:scale-105 sm:h-13 sm:w-13 ${
                isAllActive ? "border-brand bg-surface shadow-xs" : "border-border bg-background"
              }`}
            >
              {parentCategory.imageUrl ? (
                <Image
                  src={parentCategory.imageUrl}
                  alt="All"
                  fill
                  className="object-contain p-1.5"
                  sizes="48px"
                />
              ) : (
                <Grid size={20} className={isAllActive ? "text-brand" : "text-ink-muted"} />
              )}
            </div>
            <span className="mt-1.5 line-clamp-2 text-[10px] leading-tight sm:text-[11px]">
              All {parentCategory.name.split(" ")[0]}
            </span>
            {isAllActive && (
              <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-brand" />
            )}
          </Link>

          {/* Subcategory List Items */}
          {subcategories.map((subcat) => {
            const isActive = activeSubcategorySlug === subcat.slug;
            return (
              <Link
                key={subcat.id}
                href={`/c/${parentCategory.slug}/${subcat.slug}`}
                className={`group relative flex flex-col items-center justify-center rounded-xl p-2 text-center transition-all ${
                  isActive
                    ? "bg-brand/10 text-brand font-semibold shadow-xs ring-1 ring-brand/30"
                    : "text-ink-muted hover:bg-background hover:text-ink"
                }`}
              >
                <div
                  className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-transform group-hover:scale-105 sm:h-13 sm:w-13 ${
                    isActive ? "border-brand bg-surface shadow-xs" : "border-border bg-background"
                  }`}
                >
                  {subcat.imageUrl ? (
                    <Image
                      src={subcat.imageUrl}
                      alt={subcat.name}
                      fill
                      className="object-contain p-1.5"
                      sizes="48px"
                    />
                  ) : (
                    <Package size={18} className={isActive ? "text-brand" : "text-border"} />
                  )}
                </div>
                <span className="mt-1.5 line-clamp-2 text-[10px] leading-tight sm:text-[11px]">
                  {subcat.name}
                </span>
                {isActive && (
                  <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-brand" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
