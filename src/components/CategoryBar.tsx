"use client";

import Link from "next/link";
import Image from "next/image";

export type CategoryBarItem = {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string | null;
};

export function CategoryBar({ categories }: { categories: CategoryBarItem[] }) {
  if (!categories || categories.length === 0) return null;

  return (
    <nav
      aria-label="Category Navigation Bar"
      className="w-full border-t border-border/60 bg-surface/95 py-1.5 sm:py-2.5 backdrop-blur overflow-x-auto scrollbar-none"
    >
      <div className="mx-auto flex max-w-6xl items-center gap-2.5 px-3 sm:gap-4 sm:px-4">
        {/* All Brands Item */}
        <Link
          href="/brands"
          className="group flex flex-col items-center text-center shrink-0 w-14 sm:w-18 md:w-20"
        >
          <div className="flex h-11 w-11 sm:h-13 sm:w-13 md:h-15 md:w-15 items-center justify-center rounded-xl sm:rounded-2xl border border-brand/30 bg-brand/10 shadow-2xs transition-all group-hover:scale-105 group-active:scale-95">
            <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-wider text-brand">
              BRANDS
            </span>
          </div>
          <span className="mt-1 text-[10px] sm:text-xs font-semibold text-ink leading-tight line-clamp-1 max-w-[56px] sm:max-w-[72px]">
            All Brands
          </span>
        </Link>

        {/* Top Category Logo Items (Super Zoomed & Compact) */}
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/c/${category.slug}`}
            className="group flex flex-col items-center text-center shrink-0 w-14 sm:w-18 md:w-20"
          >
            <div className="relative flex h-11 w-11 sm:h-13 sm:w-13 md:h-15 md:w-15 items-center justify-center overflow-hidden rounded-xl sm:rounded-2xl border border-border/80 bg-background/70 shadow-2xs transition-all group-hover:scale-105 group-hover:border-brand/50 group-active:scale-95">
              {category.imageUrl ? (
                <Image
                  src={category.imageUrl}
                  alt={category.name}
                  fill
                  className="object-cover scale-135 sm:scale-140 transition-transform duration-200 group-hover:scale-150"
                  sizes="60px"
                />
              ) : (
                <span className="text-xs font-extrabold text-ink-muted">
                  {category.name.substring(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            <span className="mt-1 text-[10px] sm:text-xs font-semibold text-ink leading-tight line-clamp-1 max-w-[56px] sm:max-w-[72px]">
              {category.name}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
