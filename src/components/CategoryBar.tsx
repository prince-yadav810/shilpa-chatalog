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
      className="w-full border-t border-border/60 bg-surface/95 py-3 backdrop-blur overflow-x-auto scrollbar-none"
    >
      <div className="mx-auto flex max-w-6xl items-start gap-3.5 px-3 sm:gap-5 sm:px-4">
        {/* All Brands Item */}
        <Link
          href="/brands"
          className="group flex flex-col items-center text-center shrink-0 w-20 sm:w-24 md:w-26"
        >
          <div className="flex h-16 w-16 sm:h-20 sm:w-20 md:h-22 md:w-22 items-center justify-center rounded-2xl border-2 border-brand/30 bg-brand/10 shadow-sm transition-transform group-hover:scale-110">
            <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-brand">
              BRANDS
            </span>
          </div>
          <span className="mt-1.5 text-xs sm:text-sm font-bold text-ink leading-tight line-clamp-1">
            All Brands
          </span>
        </Link>

        {/* Top 3D Category Logo Items (Super Zoomed & Prominent) */}
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/c/${category.slug}`}
            className="group flex flex-col items-center text-center shrink-0 w-20 sm:w-24 md:w-26"
          >
            <div className="relative flex h-16 w-16 sm:h-20 sm:w-20 md:h-22 md:w-22 items-center justify-center overflow-hidden rounded-2xl border-2 border-border/80 bg-background shadow-xs transition-all group-hover:scale-110 group-hover:border-brand group-hover:shadow-md">
              {category.imageUrl ? (
                <Image
                  src={category.imageUrl}
                  alt={category.name}
                  fill
                  className="object-cover transition-transform duration-300 scale-135 group-hover:scale-150"
                  sizes="88px"
                />
              ) : (
                <span className="text-base font-extrabold text-ink-muted">
                  {category.name.substring(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            <span className="mt-1.5 text-xs sm:text-sm font-bold text-ink leading-tight line-clamp-2">
              {category.name}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
