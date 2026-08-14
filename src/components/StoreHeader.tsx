"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { CartButton } from "@/components/CartButton";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";
import { buildContactLink, formatDisplayNumber } from "@/lib/whatsapp";

export function StoreHeader({
  storeName,
  whatsappNumber,
}: {
  storeName: string;
  whatsappNumber: string;
}) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Close mobile search when navigating to a new route
  useEffect(() => {
    setIsSearchOpen(false);
  }, [pathname]);

  // Focus input when search bar opens
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

  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-surface shadow-xs">
      {/* Top Header Row */}
      <div className="mx-auto flex max-w-6xl items-center gap-2.5 px-3 py-2.5 sm:gap-4 sm:px-4">
        {/* Logo & Store Name */}
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <Image
            src="/logo.png"
            alt=""
            width={34}
            height={34}
            className="h-8 w-8 sm:h-9 sm:w-9 object-contain"
            priority
          />
          <span className="font-heading text-base sm:text-lg text-brand font-bold">
            {storeName}
          </span>
        </Link>

        {/* Desktop Search Bar (Center) */}
        <div className="hidden flex-1 md:block max-w-md mx-auto">
          <form
            role="search"
            className="relative"
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
              placeholder="Search products"
              aria-label="Search products"
              className="field rounded-lg py-2 pl-9 pr-3 text-sm"
            />
          </form>
        </div>

        {/* Actions Section */}
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          {/* Mobile Search Button (Immediately to the left of Cart button) */}
          <button
            type="button"
            onClick={() => setIsSearchOpen((prev) => !prev)}
            aria-label={isSearchOpen ? "Close search bar" : "Open search"}
            aria-expanded={isSearchOpen}
            className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-all md:hidden ${
              isSearchOpen
                ? "border-brand bg-brand/10 text-brand"
                : "border-border/80 bg-surface text-ink hover:bg-background active:scale-95"
            }`}
          >
            {isSearchOpen ? <X size={18} /> : <Search size={18} />}
          </button>

          {/* Your Order / Cart Button */}
          <CartButton />

          {/* WhatsApp Direct Chat Button */}
          {whatsappNumber && (
            <a
              href={buildContactLink(whatsappNumber, storeName)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-whatsapp h-9 px-2.5 text-xs sm:px-3 sm:text-caption rounded-lg"
            >
              <WhatsAppIcon className="h-4 w-4" />
              <span className="hidden lg:inline">
                {formatDisplayNumber(whatsappNumber)}
              </span>
              <span className="lg:hidden">Chat</span>
            </a>
          )}
        </div>
      </div>

      {/* Expandable Mobile Search Input Row */}
      {isSearchOpen && (
        <div className="border-t border-border/70 bg-surface/98 px-3 py-2 shadow-inner md:hidden">
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
                placeholder="Search products, brands, pack size..."
                aria-label="Search products"
                className="field w-full rounded-lg py-2 pl-9 pr-8 text-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-ink-muted hover:text-ink"
                  aria-label="Clear query"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <button
              type="submit"
              className="btn-primary h-9 px-3.5 text-xs font-bold rounded-lg shrink-0"
            >
              Search
            </button>
          </form>
        </div>
      )}
    </header>
  );
}
