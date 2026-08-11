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
    <nav aria-label="Category Navigation" className="w-full overflow-x-auto py-3 scrollbar-none">
      <div className="flex items-center gap-3 px-1 sm:gap-4">
        {/* All Brands Pill */}
        <Link
          href="/brands"
          className="group flex flex-col items-center justify-center text-center shrink-0 w-16 sm:w-20"
        >
          <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl border border-brand/30 bg-brand/10 p-2 shadow-xs transition-transform group-hover:scale-105">
            <span className="text-xs font-bold uppercase tracking-wider text-brand">Brands</span>
          </div>
          <span className="mt-1.5 text-[10px] sm:text-xs font-medium text-ink line-clamp-1">
            All Brands
          </span>
        </Link>

        {/* Top-Level Category 3D Logos */}
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/c/${category.slug}`}
            className="group flex flex-col items-center justify-center text-center shrink-0 w-16 sm:w-20"
          >
            <div className="relative flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl border border-border/80 bg-surface p-1.5 shadow-xs transition-transform group-hover:scale-105 group-hover:border-brand/40">
              {category.imageUrl ? (
                <Image
                  src={category.imageUrl}
                  alt={category.name}
                  fill
                  className="object-contain p-1"
                  sizes="64px"
                />
              ) : (
                <span className="text-xs font-bold text-ink-muted">
                  {category.name.substring(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            <span className="mt-1.5 text-[10px] sm:text-xs font-medium text-ink leading-tight line-clamp-2">
              {category.name}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
