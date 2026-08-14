"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X, ArrowLeft } from "lucide-react";
import { CategoryBar, type CategoryBarItem } from "@/components/CategoryBar";

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
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isHome = pathname === "/";

  // Close search when navigating to a new route
  useEffect(() => {
    setIsSearchOpen(false);
  }, [pathname]);

  // Auto-focus input when search opens
  useEffect(() => {
    if (isSearchOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isSearchOpen]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      router.push(`/search?q=${encodeURIComponent(q)}`);
      setIsSearchOpen(false);
    }
  };

  // Determine contextual page title for non-home pages
  const getContextTitle = () => {
    if (pathname.startsWith("/c/")) {
      const parts = pathname.split("/").filter(Boolean);
      // If at parent category, use first segment; if subcategory, use that or parent
      const parentSlug = parts[1];
      return formatSlugToTitle(parentSlug);
    }
    if (pathname.startsWith("/brand/")) {
      const parts = pathname.split("/").filter(Boolean);
      return formatSlugToTitle(parts[1]);
    }
    if (pathname === "/brands") return "All Brands";
    if (pathname === "/search") {
      const q = searchParams.get("q");
      return q ? `Results for “${q}”` : "Search Products";
    }
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
          <form
            role="search"
            className="relative flex-1"
            onSubmit={(e) => {
              e.preventDefault();
              const target = e.currentTarget.elements.namedItem("q") as HTMLInputElement;
              const q = target?.value?.trim();
              if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
            }}
          >
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
              aria-hidden="true"
            />
            <input
              type="search"
              name="q"
              placeholder="Search products, brands, or essentials..."
              aria-label="Search products"
              className="field w-full rounded-xl py-2 pl-9 pr-3 text-xs sm:text-sm bg-background/80 border-border/80 shadow-2xs focus:bg-surface focus:border-brand"
            />
          </form>
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
          <form
            role="search"
            onSubmit={handleSearchSubmit}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
                aria-hidden="true"
              />
              <input
                ref={inputRef}
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products, brands..."
                aria-label="Search products"
                className="field w-full rounded-xl py-1.5 pl-9 pr-8 text-xs sm:text-sm bg-background border-border"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink p-0.5"
                  aria-label="Clear query"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <button
              type="submit"
              className="btn-primary h-8 px-3 text-xs font-bold rounded-lg shrink-0"
            >
              Search
            </button>
          </form>
        </div>
      )}

      {/* Sticky Fixed Category Bar on Home Page (Does not scroll away when scrolling home page) */}
      {isHome && categories.length > 0 && (
        <CategoryBar categories={categories} />
      )}
    </header>
  );
}
