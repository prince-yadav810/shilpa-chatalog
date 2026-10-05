"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
 * navigating back shows data instantly. Includes "Load More" functionality.
 */
export function ClientProductSection({
  categoryId,
  brandId,
  inStockOnly = false,
  sort = "recommended",
  whatsappNumber,
  storeName,
  onLoaded,
}: {
  categoryId: string;
  brandId?: string;
  inStockOnly?: boolean;
  sort?: ProductSort;
  whatsappNumber: string;
  storeName: string;
  /** Called with the true total product count once data is loaded */
  onLoaded?: (totalCount: number) => void;
}) {
  const key = cacheKey(categoryId, brandId, inStockOnly, sort);
  const cached = cache.get(key);
  const onLoadedRef = useRef(onLoaded);
  const [products, setProducts] = useState<ProductCardData[] | null>(
    cached?.products ?? null
  );
  const [loading, setLoading] = useState(!cached);

  const [page, setPage] = useState(cached?.page ?? 1);
  const [totalPages, setTotalPages] = useState(cached?.totalPages ?? 1);
  const [loadingMore, setLoadingMore] = useState(false);

  // The parent passes a per-section callback. Keep its latest version without
  // making the fetch effect restart whenever product counts re-render the feed.
  useEffect(() => {
    onLoadedRef.current = onLoaded;
  }, [onLoaded]);

  const fetchProducts = useCallback(
    async (targetPage: number, append = false) => {
      try {
        if (!append) setLoading(true);
        else setLoadingMore(true);

        const params = new URLSearchParams({ categoryId, page: String(targetPage), sort });
        if (brandId) params.set("brandId", brandId);
        if (inStockOnly) params.set("inStock", "true");
        const res = await fetch(`/api/store/products?${params.toString()}`);
        if (!res.ok) return;
        const data = await res.json();

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
      } catch {
        // Silently fail — skeleton stays
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [brandId, categoryId, inStockOnly, key, sort]
  );

  useEffect(() => {
    const cachedData = cache.get(key);
    if (!cachedData) {
      setProducts(null);
      setPage(1);
      setTotalPages(1);
      fetchProducts(1, false);
    } else {
      setProducts(cachedData.products);
      setPage(cachedData.page);
      setTotalPages(cachedData.totalPages);
      setLoading(false);
      onLoadedRef.current?.(cachedData.total);
    }
  }, [fetchProducts, key]);

  if (loading || products === null) {
    return <ProductSkeleton />;
  }

  if (products.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/80 bg-background/50 p-5 text-center text-xs text-ink-muted">
        No products currently available
      </div>
    );
  }

  const hasMore = page < totalPages;

  return (
    <div>
      <ProductGrid
        products={products}
        whatsappNumber={whatsappNumber}
        storeName={storeName}
      />
      {hasMore && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => fetchProducts(page + 1, true)}
            disabled={loadingMore}
            className="btn-secondary text-xs"
          >
            {loadingMore ? "Loading..." : "Load more products"}
          </button>
        </div>
      )}
    </div>
  );
}
