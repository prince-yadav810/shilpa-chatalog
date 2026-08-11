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
  return (
    <nav
      aria-label="Category Navigation Bar"
      className="w-full border-t border-border/60 bg-surface/95 py-2.5 backdrop-blur overflow-x-auto scrollbar-none"
    >
      <div className="mx-auto flex max-w-6xl items-start gap-3 px-3 sm:gap-4 sm:px-4">
        {/* All Brands Item */}
        <Link
          href="/brands"
          className="group flex flex-col items-center text-center shrink-0 w-18 sm:w-22"
        >
          <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl border border-brand/30 bg-brand/10 shadow-xs transition-transform group-hover:scale-110">
            <span className="text-xs font-black uppercase tracking-wider text-brand">
              BRANDS
            </span>
          </div>
          <span className="mt-1.5 text-[11px] sm:text-xs font-bold text-ink leading-tight line-clamp-1">
            All Brands
          </span>
        </Link>

        {/* Top 3D Category Logo Items (Zoomed In & Prominent) */}
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/c/${category.slug}`}
            className="group flex flex-col items-center text-center shrink-0 w-18 sm:w-22"
          >
            <div className="relative flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center overflow-hidden rounded-2xl border border-border/80 bg-background shadow-xs transition-all group-hover:scale-110 group-hover:border-brand/50 group-hover:shadow-md">
              {category.imageUrl ? (
                <Image
                  src={category.imageUrl}
                  alt={category.name}
                  fill
                  className="object-contain p-0.5 transition-transform duration-300 scale-110 group-hover:scale-125"
                  sizes="64px"
                />
              ) : (
                <span className="text-sm font-bold text-ink-muted">
                  {category.name.substring(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            <span className="mt-1.5 text-[11px] sm:text-xs font-bold text-ink leading-tight line-clamp-2">
              {category.name}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
