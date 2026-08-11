"use client";

import Link from "next/link";
import Image from "next/image";
import { Award } from "lucide-react";

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
      className="w-full border-t border-border/60 bg-surface/95 py-2 backdrop-blur overflow-x-auto scrollbar-none"
    >
      <div className="mx-auto flex max-w-6xl items-start gap-2.5 px-3 sm:gap-3.5 sm:px-4">
        {/* All Brands Item */}
        <Link
          href="/brands"
          className="group flex flex-col items-center text-center shrink-0 w-16 sm:w-20"
        >
          <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl border border-brand/30 bg-brand/10 p-1.5 shadow-xs transition-transform group-hover:scale-105">
            <span className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-brand">
              BRANDS
            </span>
          </div>
          <span className="mt-1 text-[10px] sm:text-[11px] font-semibold text-ink leading-tight line-clamp-1">
            All Brands
          </span>
        </Link>

        {/* Top 3D Category Logo Items */}
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/c/${category.slug}`}
            className="group flex flex-col items-center text-center shrink-0 w-16 sm:w-20"
          >
            <div className="relative flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl border border-border/80 bg-background p-1 shadow-xs transition-transform group-hover:scale-105 group-hover:border-brand/40">
              {category.imageUrl ? (
                <Image
                  src={category.imageUrl}
                  alt={category.name}
                  fill
                  className="object-contain p-1"
                  sizes="56px"
                />
              ) : (
                <span className="text-xs font-bold text-ink-muted">
                  {category.name.substring(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            <span className="mt-1 text-[10px] sm:text-[11px] font-semibold text-ink leading-tight line-clamp-2">
              {category.name}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
