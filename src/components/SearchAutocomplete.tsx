"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle, Package, Search } from "lucide-react";
import { formatPrice } from "@/lib/pricing";
import type { ProductCardData } from "@/components/ProductCard";

type SuggestionResponse = {
  products: ProductCardData[];
  total: number;
};

export function SearchAutocomplete({
  placeholder,
  inputClassName,
  autoFocus = false,
  onNavigate,
}: {
  placeholder: string;
  inputClassName: string;
  autoFocus?: boolean;
  onNavigate?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SuggestionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();
  const router = useRouter();
  const cleanQuery = query.trim();
  const products = suggestions?.products ?? [];

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  useEffect(() => {
    if (cleanQuery.length < 2) {
      setSuggestions(null);
      setLoading(false);
      setActiveIndex(-1);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/search/suggestions?q=${encodeURIComponent(cleanQuery)}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Suggestion request failed");
        const data = (await response.json()) as SuggestionResponse;
        setSuggestions(data);
        setOpen(true);
        setActiveIndex(-1);
      } catch (error) {
        if ((error as Error).name !== "AbortError") setSuggestions(null);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [cleanQuery]);

  function goToSearch() {
    if (!cleanQuery) return;
    setOpen(false);
    onNavigate?.();
    router.push(`/search?q=${encodeURIComponent(cleanQuery)}`);
  }

  function goToProduct(product: ProductCardData) {
    setOpen(false);
    onNavigate?.();
    router.push(`/product/${product.slug}`);
  }

  const showPanel = open && cleanQuery.length >= 2;
  const totalOptions = products.length + 1;

  return (
    <div ref={rootRef} className="relative">
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          if (activeIndex >= 0 && activeIndex < products.length) {
            goToProduct(products[activeIndex]);
          } else {
            goToSearch();
          }
        }}
      >
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          name="q"
          value={query}
          onFocus={() => cleanQuery.length >= 2 && setOpen(true)}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (!showPanel || totalOptions === 0) return;
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActiveIndex((current) => Math.min(current + 1, totalOptions - 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex((current) => Math.max(current - 1, -1));
            } else if (event.key === "Escape") {
              setOpen(false);
              setActiveIndex(-1);
            }
          }}
          placeholder={placeholder}
          aria-label="Search products"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={showPanel}
          aria-activedescendant={
            activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
          }
          className={inputClassName}
        />
      </form>

      {showPanel && (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Product suggestions"
          className="absolute inset-x-0 top-[calc(100%+0.45rem)] z-50 overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_18px_42px_rgba(28,31,29,0.18)]"
        >
          <div className="flex items-center justify-between border-b border-border/70 bg-background/70 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-ink-muted">
              {loading ? "Finding matches" : products.length > 0 ? "Best matches" : "No quick matches"}
            </p>
            {loading && <LoaderCircle size={14} className="animate-spin text-brand" aria-label="Loading" />}
          </div>

          {products.length > 0 ? (
            <ul className="divide-y divide-border/60">
              {products.map((product, index) => (
                <li key={product.id}>
                  <button
                    id={`${listboxId}-option-${index}`}
                    type="button"
                    role="option"
                    aria-selected={activeIndex === index}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => goToProduct(product)}
                    className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                      activeIndex === index ? "bg-brand/8" : "hover:bg-background"
                    }`}
                  >
                    <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-background">
                      {product.imageUrl ? (
                        <Image
                          src={product.imageUrl}
                          alt=""
                          fill
                          sizes="44px"
                          className="object-contain p-1"
                          unoptimized
                        />
                      ) : (
                        <Package size={18} className="text-border" aria-hidden="true" />
                      )}
                    </div>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">{product.name}</span>
                      <span className="mt-0.5 block truncate text-[11px] text-ink-muted">
                        {[product.brand?.name, product.variant].filter(Boolean).join(" · ") || "Product"}
                      </span>
                    </span>
                    <span className="price shrink-0 text-xs font-bold text-ink">{formatPrice(product.price)}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : !loading ? (
            <p className="px-3 py-4 text-center text-xs text-ink-muted">
              Press Enter to search the full catalog.
            </p>
          ) : null}

          <button
            id={`${listboxId}-option-${products.length}`}
            type="button"
            role="option"
            aria-selected={activeIndex === products.length}
            onMouseEnter={() => setActiveIndex(products.length)}
            onClick={goToSearch}
            className={`flex w-full items-center justify-between border-t border-border px-3 py-2.5 text-left text-xs font-bold text-brand transition-colors ${
              activeIndex === products.length ? "bg-brand/8" : "hover:bg-background"
            }`}
          >
            <span>
              Search all results for <span className="font-semibold">“{cleanQuery}”</span>
              {suggestions && suggestions.total > products.length ? ` (${suggestions.total})` : ""}
            </span>
            <ArrowRight size={15} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
