"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Search, X, ArrowLeft } from "lucide-react";
import { CategoryBar, type CategoryBarItem } from "@/components/CategoryBar";
import { SearchAutocomplete } from "@/components/SearchAutocomplete";

function formatSlugToTitle(slug: string): string {
  if (!slug) return "";
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
    .replace(/\bAnd\b/g, "&");
}

export function StoreHeader({
  storeName,
  categories = [],
}: {
  storeName: string;
  categories?: CategoryBarItem[];
}) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const isHome = pathname === "/";

  // Close search when navigating to a new route
  useEffect(() => {
    setIsSearchOpen(false);
  }, [pathname]);

  // Determine contextual page title for non-home pages
  const getContextTitle = () => {
    if (pathname.startsWith("/c/")) {
      const parts = pathname.split("/").filter(Boolean);
      // e.g. /c/ice-cream-frozen-desserts -> parts[1]
      const parentSlug = parts[1] || "";
      return formatSlugToTitle(parentSlug);
    }
    if (pathname.startsWith("/brand/")) {
      const parts = pathname.split("/").filter(Boolean);
      return formatSlugToTitle(parts[1] || "");
    }
    if (pathname === "/brands") return "All Brands";
    if (pathname === "/search") return "Search Products";
    if (pathname.startsWith("/product/")) return "Product Details";
    return storeName;
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-surface shadow-xs">
      {isHome ? (
        /* Home Page Header: Logo Only + Full Width Search Bar */
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-2 sm:gap-3.5 sm:px-4">
          {/* Shilpa Logo Only (No text next to it) */}
          <Link href="/" className="flex shrink-0 items-center">
            <Image
              src="/logo.png"
              alt="Shilpa"
              width={36}
              height={36}
              className="h-8.5 w-8.5 sm:h-9 sm:w-9 object-contain"
              priority
            />
          </Link>

          {/* Full Width Search Bar */}
          <div className="flex-1">
            <SearchAutocomplete
              placeholder="Search products, brands, or essentials..."
              inputClassName="field w-full rounded-xl border-border/80 bg-background/80 py-2 pl-9 pr-3 text-[16px] shadow-2xs focus:border-brand focus:bg-surface sm:text-sm"
            />
          </div>
        </div>
      ) : (
        /* Listing / Category Header (Instamart style: [← Back] [Category Title] [🔍 Search]) */
        <div className="mx-auto flex max-w-6xl h-12 items-center justify-between px-2 sm:px-4">
          {/* Back Button */}
          <button
            type="button"
            onClick={() => {
              if (window.history.length > 1) {
                router.back();
              } else {
                router.push("/");
              }
            }}
            aria-label="Go back"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink hover:bg-background active:scale-95 transition-transform shrink-0"
          >
            <ArrowLeft size={20} className="stroke-[2.2]" />
          </button>

          {/* Category / Page Title */}
          <h1 className="font-heading text-sm sm:text-base font-bold text-ink truncate text-center flex-1 px-2">
            {getContextTitle()}
          </h1>

          {/* Search Icon Button */}
          <button
            type="button"
            onClick={() => setIsSearchOpen((prev) => !prev)}
            aria-label={isSearchOpen ? "Close search" : "Open search"}
            aria-expanded={isSearchOpen}
            className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all shrink-0 ${
              isSearchOpen
                ? "bg-brand/10 text-brand"
                : "text-ink hover:bg-background active:scale-95"
            }`}
          >
            {isSearchOpen ? <X size={20} /> : <Search size={20} className="stroke-[2.2]" />}
          </button>
        </div>
      )}

      {/* Expandable Search Bar on Category/Listing pages when Search icon clicked */}
      {isSearchOpen && (
        <div className="border-t border-border/70 bg-surface px-3 py-2 shadow-inner">
          <SearchAutocomplete
            autoFocus
            onNavigate={() => setIsSearchOpen(false)}
            placeholder="Search products, brands..."
            inputClassName="field w-full rounded-xl border-border bg-background py-1.5 pl-9 pr-3 text-[16px] sm:text-sm"
          />
        </div>
      )}

      {/* Sticky Fixed Category Bar on Home Page (Does not scroll away when scrolling home page) */}
      {isHome && categories.length > 0 && (
        <CategoryBar categories={categories} />
      )}
    </header>
  );
}
