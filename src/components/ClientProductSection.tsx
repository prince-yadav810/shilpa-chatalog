"use client";

import { useState, useEffect, useCallback } from "react";
import { ProductGrid } from "@/components/ProductGrid";
import type { ProductCardData } from "@/components/ProductCard";

/* ── In-memory cache so back-navigation is instant ── */
const cache = new Map<string, { products: ProductCardData[]; total: number }>();

function cacheKey(categoryId: string) {
  return `cat-${categoryId}`;
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
 * navigating back shows data instantly.
 */
export function ClientProductSection({
  categoryId,
  whatsappNumber,
  storeName,
  onLoaded,
}: {
  categoryId: string;
  whatsappNumber: string;
  storeName: string;
  /** Called with the product count once data is loaded */
  onLoaded?: (count: number) => void;
}) {
  const [products, setProducts] = useState<ProductCardData[] | null>(
    cache.get(cacheKey(categoryId))?.products ?? null
  );
  const [loading, setLoading] = useState(!cache.has(cacheKey(categoryId)));

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch(`/api/store/products?categoryId=${categoryId}`);
      if (!res.ok) return;
      const data = await res.json();
      cache.set(cacheKey(categoryId), data);
      setProducts(data.products);
      onLoaded?.(data.products.length);
    } catch {
      // Silently fail — skeleton stays
    } finally {
      setLoading(false);
    }
  }, [categoryId, onLoaded]);

  useEffect(() => {
    if (cache.has(cacheKey(categoryId))) {
      const cached = cache.get(cacheKey(categoryId))!;
      setProducts(cached.products);
      setLoading(false);
      onLoaded?.(cached.products.length);
      return;
    }
    fetchProducts();
  }, [categoryId, fetchProducts, onLoaded]);

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

  return (
    <ProductGrid
      products={products}
      whatsappNumber={whatsappNumber}
      storeName={storeName}
    />
  );
}
