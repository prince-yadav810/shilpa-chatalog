"use client";

import { useCallback, useEffect, useState } from "react";
import type { CategoryOption } from "@/components/admin/ProductForm";
import {
  AdminProductCard,
  type AdminProductCardData,
} from "@/components/admin/AdminProductCard";

type CachedShelf = {
  products: AdminProductCardData[];
  total: number;
  page: number;
  totalPages: number;
};

const shelfCache = new Map<string, CachedShelf>();

function cacheKey(categoryId: string, archived: boolean) {
  return `${archived ? "archived" : "active"}-${categoryId}`;
}

function ProductSkeleton() {
  return (
    <div className="grid animate-pulse grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={index}
          className="flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-surface p-3"
        >
          <div className="aspect-square w-full rounded-xl bg-border/40" />
          <div className="mt-3 h-3 w-16 rounded bg-border/60" />
          <div className="mt-1.5 h-4 w-full rounded bg-border/60" />
          <div className="mt-1.5 h-4 w-2/3 rounded bg-border/40" />
          <div className="mt-3 h-5 w-14 rounded bg-border/60" />
        </div>
      ))}
    </div>
  );
}

/** A private shelf that mirrors the storefront grid but uses admin cards. */
export function AdminProductSection({
  categoryId,
  archived,
  categories,
  onLoaded,
}: {
  categoryId: string;
  archived: boolean;
  categories: CategoryOption[];
  onLoaded?: (total: number) => void;
}) {
  const key = cacheKey(categoryId, archived);
  const cached = shelfCache.get(key);
  const [products, setProducts] = useState<AdminProductCardData[] | null>(
    cached?.products ?? null,
  );
  const [loading, setLoading] = useState(!cached);
  const [page, setPage] = useState(cached?.page ?? 1);
  const [totalPages, setTotalPages] = useState(cached?.totalPages ?? 1);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchProducts = useCallback(
    async (targetPage: number, append = false) => {
      try {
        if (append) setLoadingMore(true);
        else setLoading(true);

        const params = new URLSearchParams({
          categoryId,
          page: String(targetPage),
          archived: String(archived),
        });
        const response = await fetch(`/api/products?${params.toString()}`);
        if (!response.ok) return;
        const data = await response.json();
        const fetched = (data.products as Omit<AdminProductCardData, "isArchived">[]).map(
          (product) => ({ ...product, isArchived: archived }),
        );

        setProducts((current) => {
          const next = append ? [...(current ?? []), ...fetched] : fetched;
          shelfCache.set(key, {
            products: next,
            total: data.total,
            page: targetPage,
            totalPages: data.totalPages,
          });
          return next;
        });
        setPage(targetPage);
        setTotalPages(data.totalPages);
        if (!append) onLoaded?.(data.total);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [archived, categoryId, key, onLoaded],
  );

  useEffect(() => {
    const found = shelfCache.get(key);
    if (found) {
      onLoaded?.(found.total);
      return;
    }
    fetchProducts(1);
  }, [fetchProducts, key, onLoaded]);

  function removeProduct(productId: string) {
    const currentCache = shelfCache.get(key);
    const nextTotal = Math.max(0, (currentCache?.total ?? products?.length ?? 1) - 1);
    if (currentCache) {
      shelfCache.set(key, {
        ...currentCache,
        products: currentCache.products.filter((product) => product.id !== productId),
        total: nextTotal,
      });
    }
    setProducts((current) => (current ?? []).filter((product) => product.id !== productId));
    onLoaded?.(nextTotal);
  }

  if (loading || products === null) return <ProductSkeleton />;

  if (products.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/80 bg-background/50 p-5 text-center text-xs text-ink-muted">
        No {archived ? "archived" : "active"} products in this subcategory.
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {products.map((product) => (
          <AdminProductCard
            key={product.id}
            product={product}
            categories={categories}
            onRemoved={removeProduct}
          />
        ))}
      </div>
      {page < totalPages && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => fetchProducts(page + 1, true)}
            disabled={loadingMore}
            className="btn-secondary text-xs"
          >
            {loadingMore ? "Loading…" : "Load more products"}
          </button>
        </div>
      )}
    </div>
  );
}
