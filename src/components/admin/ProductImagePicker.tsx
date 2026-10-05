"use client";

import Image from "next/image";
import { ImageIcon, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useToast } from "@/components/admin/Toast";

export type ProductImageOption = {
  id: string;
  name: string;
  imageUrl: string;
  brandName: string | null;
};

/**
 * Reuses existing product photography for category navigation. The editor
 * receives the product list from the server, so selecting an image is instant
 * and doesn't require an extra upload or an image URL copy/paste.
 */
export function ProductImagePicker({
  products,
  categoryName,
  selectedUrl,
  onSelect,
}: {
  products: ProductImageOption[];
  categoryName: string;
  selectedUrl: string;
  onSelect: (url: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { show } = useToast();

  const visibleProducts = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    if (!needle) return products;
    return products.filter((product) =>
      `${product.name} ${product.brandName ?? ""}`.toLocaleLowerCase().includes(needle),
    );
  }, [products, query]);

  if (products.length === 0) return null;

  return (
    <>
      <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-border bg-background/50 px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="text-caption font-medium text-ink">Use one of this subcategory&rsquo;s products</p>
          <p className="mt-0.5 text-[11px] leading-snug text-ink-muted">
            Reuse a product photo instead of uploading a separate image.
          </p>
        </div>
        <button type="button" onClick={() => setOpen(true)} className="btn-secondary shrink-0 py-2 text-xs">
          <ImageIcon size={15} />
          Choose product image
        </button>
      </div>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="product-image-picker-title"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/35 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div className="max-h-[min(42rem,calc(100vh-2rem))] w-full max-w-3xl overflow-hidden rounded-2xl border border-border bg-surface shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
              <div>
                <p className="text-caption font-medium uppercase tracking-[0.12em] text-ink-muted">Category image</p>
                <h2 id="product-image-picker-title" className="mt-0.5 font-heading text-lg font-semibold text-ink">
                  Choose a product from {categoryName}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close product image picker"
                className="rounded-lg p-1.5 text-ink-muted hover:bg-background hover:text-ink"
              >
                <X size={18} />
              </button>
            </div>

            <div className="border-b border-border px-5 py-3">
              <label className="relative block">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                <input
                  autoFocus
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Find a product or brand"
                  className="field py-2 pl-9 text-sm"
                />
              </label>
            </div>

            <div className="max-h-[calc(min(42rem,100vh-2rem)-11rem)] overflow-y-auto p-4">
              {visibleProducts.length === 0 ? (
                <p className="py-10 text-center text-caption text-ink-muted">No matching product image.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {visibleProducts.map((product) => {
                    const selected = product.imageUrl === selectedUrl;
                    return (
                      <button
                        key={product.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => {
                          onSelect(product.imageUrl);
                          setOpen(false);
                          show("Product image selected");
                        }}
                        className={`group overflow-hidden rounded-xl border bg-surface text-left transition-all hover:border-brand/60 hover:shadow-sm ${
                          selected ? "border-brand ring-2 ring-brand/20" : "border-border"
                        }`}
                      >
                        <div className="relative aspect-square bg-background/60">
                          <Image
                            src={product.imageUrl}
                            alt={product.name}
                            fill
                            unoptimized
                            sizes="(max-width: 640px) 42vw, 180px"
                            className="object-contain p-2 transition-transform duration-200 group-hover:scale-105"
                          />
                          {selected && (
                            <span className="absolute left-2 top-2 rounded-md bg-brand px-1.5 py-0.5 text-[10px] font-semibold text-white">
                              Selected
                            </span>
                          )}
                        </div>
                        <div className="border-t border-border/70 p-2">
                          {product.brandName && (
                            <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                              {product.brandName}
                            </p>
                          )}
                          <p className="mt-0.5 line-clamp-2 text-[11px] font-medium leading-snug text-ink">
                            {product.name}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
