"use client";

import Image from "next/image";
import Link from "next/link";
import { Package, Grid } from "lucide-react";
import { useRef, useEffect } from "react";

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
  onSelectSubcategory,
}: {
  parentCategory: { name: string; slug: string; imageUrl?: string | null };
  subcategories: SidebarCategoryItem[];
  activeSubcategorySlug?: string;
  onSelectSubcategory?: (slug: string) => void;
}) {
  const isAllActive = !activeSubcategorySlug || activeSubcategorySlug === "all";
  const activeItemRef = useRef<HTMLButtonElement | HTMLAnchorElement | null>(null);

  // Auto-scroll the active item into view inside the sidebar if needed
  useEffect(() => {
    if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [activeSubcategorySlug]);

  const handleItemClick = (slug: string, e?: React.MouseEvent) => {
    if (onSelectSubcategory) {
      if (e) e.preventDefault();
      onSelectSubcategory(slug);
    }
  };

  return (
    <aside className="sticky top-[53px] sm:top-[60px] z-20 flex h-[calc(100vh-3.5rem)] w-[76px] sm:w-24 md:w-52 shrink-0 flex-col border-r border-border/80 bg-surface/95 backdrop-blur">
      {/* Header Label for Desktop */}
      <div className="hidden border-b border-border/60 p-3 md:block">
        <h2 className="font-heading text-sm font-bold text-ink line-clamp-1">
          {parentCategory.name}
        </h2>
        <p className="text-[11px] text-ink-muted">
          {subcategories.length} {subcategories.length === 1 ? "section" : "sections"}
        </p>
      </div>

      {/* Scrollable Subcategory Item List */}
      <nav
        aria-label="Subcategories Sidebar"
        className="flex-1 overflow-y-auto py-1.5 scrollbar-thin px-1 sm:px-1.5"
      >
        <div className="flex flex-col gap-1.5">
          {/* "All" Item */}
          {onSelectSubcategory ? (
            <button
              type="button"
              ref={isAllActive ? (activeItemRef as React.RefObject<HTMLButtonElement>) : null}
              onClick={(e) => handleItemClick("all", e)}
              className={`group relative flex flex-col items-center justify-center rounded-xl p-1.5 sm:p-2 text-center transition-all ${
                isAllActive
                  ? "bg-brand/10 text-brand font-bold shadow-2xs"
                  : "text-ink-muted hover:bg-background/80 hover:text-ink"
              }`}
            >
              <div
                className={`relative flex h-11 w-11 sm:h-13 sm:w-13 md:h-14 md:w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border transition-transform group-hover:scale-105 group-active:scale-95 ${
                  isAllActive
                    ? "border-brand/70 bg-surface shadow-2xs ring-2 ring-brand/30"
                    : "border-border/80 bg-background/80"
                }`}
              >
                {parentCategory.imageUrl ? (
                  <Image
                    src={parentCategory.imageUrl}
                    alt="All"
                    fill
                    className="object-cover scale-135"
                    sizes="56px"
                  />
                ) : (
                  <Grid size={18} className={isAllActive ? "text-brand" : "text-ink-muted"} />
                )}
              </div>
              <span className="mt-1 line-clamp-2 text-[10px] sm:text-xs font-semibold leading-tight max-w-[64px] sm:max-w-[76px]">
                All
              </span>
              {isAllActive && (
                <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-brand" />
              )}
            </button>
          ) : (
            <Link
              href={`/c/${parentCategory.slug}`}
              className={`group relative flex flex-col items-center justify-center rounded-xl p-1.5 sm:p-2 text-center transition-all ${
                isAllActive
                  ? "bg-brand/10 text-brand font-bold shadow-2xs"
                  : "text-ink-muted hover:bg-background/80 hover:text-ink"
              }`}
            >
              <div
                className={`relative flex h-11 w-11 sm:h-13 sm:w-13 md:h-14 md:w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border transition-transform group-hover:scale-105 group-active:scale-95 ${
                  isAllActive
                    ? "border-brand/70 bg-surface shadow-2xs ring-2 ring-brand/30"
                    : "border-border/80 bg-background/80"
                }`}
              >
                {parentCategory.imageUrl ? (
                  <Image
                    src={parentCategory.imageUrl}
                    alt="All"
                    fill
                    className="object-cover scale-135"
                    sizes="56px"
                  />
                ) : (
                  <Grid size={18} className={isAllActive ? "text-brand" : "text-ink-muted"} />
                )}
              </div>
              <span className="mt-1 line-clamp-2 text-[10px] sm:text-xs font-semibold leading-tight max-w-[64px] sm:max-w-[76px]">
                All
              </span>
              {isAllActive && (
                <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-brand" />
              )}
            </Link>
          )}

          {/* Subcategory List Items */}
          {subcategories.map((subcat) => {
            const isActive = activeSubcategorySlug === subcat.slug;

            if (onSelectSubcategory) {
              return (
                <button
                  key={subcat.id}
                  type="button"
                  ref={isActive ? (activeItemRef as React.RefObject<HTMLButtonElement>) : null}
                  onClick={(e) => handleItemClick(subcat.slug, e)}
                  className={`group relative flex flex-col items-center justify-center rounded-xl p-1.5 sm:p-2 text-center transition-all ${
                    isActive
                      ? "bg-brand/10 text-brand font-bold shadow-2xs"
                      : "text-ink-muted hover:bg-background/80 hover:text-ink"
                  }`}
                >
                  <div
                    className={`relative flex h-11 w-11 sm:h-13 sm:w-13 md:h-14 md:w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border transition-transform group-hover:scale-105 group-active:scale-95 ${
                      isActive
                        ? "border-brand/70 bg-surface shadow-2xs ring-2 ring-brand/30"
                        : "border-border/80 bg-background/80"
                    }`}
                  >
                    {subcat.imageUrl ? (
                      <Image
                        src={subcat.imageUrl}
                        alt={subcat.name}
                        fill
                        className="object-cover scale-135"
                        sizes="56px"
                      />
                    ) : (
                      <Package size={18} className={isActive ? "text-brand" : "text-ink-muted"} />
                    )}
                  </div>
                  <span className="mt-1 line-clamp-2 text-[10px] sm:text-xs font-semibold leading-tight max-w-[64px] sm:max-w-[76px]">
                    {subcat.name}
                  </span>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-brand" />
                  )}
                </button>
              );
            }

            return (
              <Link
                key={subcat.id}
                href={`/c/${parentCategory.slug}/${subcat.slug}`}
                className={`group relative flex flex-col items-center justify-center rounded-xl p-1.5 sm:p-2 text-center transition-all ${
                  isActive
                    ? "bg-brand/10 text-brand font-bold shadow-2xs"
                    : "text-ink-muted hover:bg-background/80 hover:text-ink"
                }`}
              >
                <div
                  className={`relative flex h-11 w-11 sm:h-13 sm:w-13 md:h-14 md:w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border transition-transform group-hover:scale-105 group-active:scale-95 ${
                    isActive
                      ? "border-brand/70 bg-surface shadow-2xs ring-2 ring-brand/30"
                      : "border-border/80 bg-background/80"
                  }`}
                >
                  {subcat.imageUrl ? (
                    <Image
                      src={subcat.imageUrl}
                      alt={subcat.name}
                      fill
                      className="object-cover scale-135"
                      sizes="56px"
                    />
                  ) : (
                    <Package size={18} className={isActive ? "text-brand" : "text-ink-muted"} />
                  )}
                </div>
                <span className="mt-1 line-clamp-2 text-[10px] sm:text-xs font-semibold leading-tight max-w-[64px] sm:max-w-[76px]">
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
