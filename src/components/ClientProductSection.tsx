"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Check, LoaderCircle } from "lucide-react";
import { ProductGrid } from "@/components/ProductGrid";
import type { ProductCardData } from "@/components/ProductCard";
import type { ProductSort } from "@/components/CatalogFilters";

/* ── In-memory cache so back-navigation is instant ── */
const cache = new Map<
  string,
  { products: ProductCardData[]; total: number; page: number; totalPages: number }
>();

function cacheKey(
  categoryId: string,
  brandId: string | undefined,
  inStockOnly: boolean,
  sort: ProductSort,
) {
  return `cat-${categoryId}-brand-${brandId ?? "all"}-stock-${inStockOnly}-sort-${sort}`;
}

/* ── Skeleton shimmer while loading ── */
function ProductSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 animate-pulse">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-surface p-3"
        >
          <div className="aspect-square w-full rounded-xl bg-border/40" />
          <div className="mt-3 h-3 w-16 rounded bg-border/60" />
          <div className="mt-1.5 h-4 w-full rounded bg-border/60" />
          <div className="mt-1.5 h-4 w-2/3 rounded bg-border/40" />
          <div className="mt-3 flex items-center justify-between">
            <div className="h-5 w-14 rounded bg-border/60" />
            <div className="h-8 w-16 rounded-lg bg-border/40" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Client component that fetches products for a single category
 * and renders them in a ProductGrid. Uses an in-memory cache so
 * navigating back shows data instantly. Further pages load automatically as a
 * shopper approaches the end of a section.
 */
export function ClientProductSection({
  categoryId,
  brandId,
  inStockOnly = false,
  sort = "recommended",
  loadWhenVisible = false,
  whatsappNumber,
  storeName,
  onLoaded,
}: {
  categoryId: string;
  brandId?: string;
  inStockOnly?: boolean;
  sort?: ProductSort;
  /** Delay work for off-screen category sections until shoppers approach them. */
  loadWhenVisible?: boolean;
  whatsappNumber: string;
  storeName: string;
  /** Called with the true total product count once data is loaded */
  onLoaded?: (totalCount: number) => void;
}) {
  const key = cacheKey(categoryId, brandId, inStockOnly, sort);
  const cached = cache.get(key);
  const onLoadedRef = useRef(onLoaded);
  const activeKeyRef = useRef(key);
  // A filter or sort change creates a new cache key. Record it during render so
  // a slower, older response can never overwrite the newer product list.
  activeKeyRef.current = key;
  const [products, setProducts] = useState<ProductCardData[] | null>(
    cached?.products ?? null
  );
  const [loading, setLoading] = useState(!cached);

  const [page, setPage] = useState(cached?.page ?? 1);
  const [totalPages, setTotalPages] = useState(cached?.totalPages ?? 1);
  const [total, setTotal] = useState(cached?.total ?? 0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isVisible, setIsVisible] = useState(!loadWhenVisible);
  const sectionRef = useRef<HTMLDivElement>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);
  const loadingMoreForKeyRef = useRef<string | null>(null);

  // The parent passes a per-section callback. Keep its latest version without
  // making the fetch effect restart whenever product counts re-render the feed.
  useEffect(() => {
    onLoadedRef.current = onLoaded;
  }, [onLoaded]);

  // Product grids further down a department page do not need to use data or
  // browser work until the shopper is close to them.
  useEffect(() => {
    if (!loadWhenVisible) {
      setIsVisible(true);
      return;
    }

    const target = sectionRef.current;
    if (!target || typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setIsVisible(true);
        observer.disconnect();
      },
      { rootMargin: "160px 0px" }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [loadWhenVisible]);

  const fetchProducts = useCallback(
    async (targetPage: number, append = false) => {
      if (append) {
        if (loadingMoreForKeyRef.current === key) return;
        loadingMoreForKeyRef.current = key;
      }

      try {
        if (!append) setLoading(true);
        else setLoadingMore(true);

        const params = new URLSearchParams({ categoryId, page: String(targetPage), sort });
        if (brandId) params.set("brandId", brandId);
        if (inStockOnly) params.set("inStock", "true");
        const res = await fetch(`/api/store/products?${params.toString()}`);
        if (!res.ok) return;
        const data = await res.json();
        if (activeKeyRef.current !== key) return;

        if (append) {
          setProducts((previousProducts) => {
            const nextProducts = [...(previousProducts ?? []), ...data.products];
            cache.set(key, {
              products: nextProducts,
              total: data.total,
              page: targetPage,
              totalPages: data.totalPages,
            });
            return nextProducts;
          });
        } else {
          cache.set(key, {
            products: data.products,
            total: data.total,
            page: targetPage,
            totalPages: data.totalPages,
          });
          setProducts(data.products);
          // This notification updates the parent's sidebar count. It must stay
          // outside a React state updater, which React can evaluate during render.
          onLoadedRef.current?.(data.total);
        }
        
        setPage(targetPage);
        setTotalPages(data.totalPages);
        setTotal(data.total);
      } catch {
        // Silently fail — skeleton stays
      } finally {
        if (activeKeyRef.current === key) {
          setLoading(false);
          setLoadingMore(false);
        }
        if (loadingMoreForKeyRef.current === key) {
          loadingMoreForKeyRef.current = null;
        }
      }
    },
    [brandId, categoryId, inStockOnly, key, sort]
  );

  useEffect(() => {
    if (!isVisible) return;

    const cachedData = cache.get(key);
    if (!cachedData) {
      setProducts(null);
      setPage(1);
      setTotalPages(1);
      setTotal(0);
      fetchProducts(1, false);
    } else {
      setProducts(cachedData.products);
      setPage(cachedData.page);
      setTotalPages(cachedData.totalPages);
      setTotal(cachedData.total);
      setLoading(false);
      onLoadedRef.current?.(cachedData.total);
    }
  }, [fetchProducts, isVisible, key]);

  const hasMore = page < totalPages;
  const loadNextPage = useCallback(() => {
    if (!hasMore || loading || loadingMore) return;
    void fetchProducts(page + 1, true);
  }, [fetchProducts, hasMore, loading, loadingMore, page]);

  // The invisible trigger sits below the grid. It starts the next small page
  // before a shopper reaches the end, replacing the easily missed button.
  useEffect(() => {
    const target = loadMoreTriggerRef.current;
    if (!target || !hasMore || !isVisible) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadNextPage();
      },
      { rootMargin: "240px 0px" }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, isVisible, loadNextPage]);

  if (!isVisible) {
    return (
      <div
        ref={sectionRef}
        className="flex min-h-[18rem] items-center justify-center rounded-2xl border border-dashed border-border/60 bg-background/35 px-4"
      >
        <span className="text-xs font-medium text-ink-muted">Products load as you browse</span>
      </div>
    );
  }

  if (loading || products === null) {
    return (
      <div ref={sectionRef}>
        <ProductSkeleton />
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/80 bg-background/50 p-5 text-center text-xs text-ink-muted">
        No products currently available
      </div>
    );
  }

  return (
    <div ref={sectionRef}>
      <ProductGrid
        products={products}
        whatsappNumber={whatsappNumber}
        storeName={storeName}
      />
      {hasMore && (
        <div
          ref={loadMoreTriggerRef}
          aria-live="polite"
          aria-busy={loadingMore}
          className="mt-6 flex min-h-12 items-center justify-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-surface px-3 py-1.5 text-[11px] font-medium text-ink-muted shadow-2xs">
            {loadingMore ? (
              <>
                <LoaderCircle size={14} className="animate-spin text-brand" aria-hidden="true" />
                Loading more products…
              </>
            ) : (
              <>
                <span className="flex gap-0.5" aria-hidden="true">
                  <span className="h-1 w-1 rounded-full bg-brand/70" />
                  <span className="h-1 w-1 rounded-full bg-brand/55" />
                  <span className="h-1 w-1 rounded-full bg-brand/40" />
                </span>
                Showing {products.length} of {total} · more load automatically
              </>
            )}
          </div>
        </div>
      )}
      {!hasMore && total > 0 && (
        <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] font-medium text-ink-muted">
          <Check size={14} className="text-brand" aria-hidden="true" />
          You’ve seen all {total} products
        </div>
      )}
    </div>
  );
}
