"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, SlidersHorizontal, X } from "lucide-react";

export type CatalogBrandOption = {
  id: string;
  name: string;
  slug: string;
  count: number;
};

export type ProductSort = "recommended" | "price-asc" | "price-desc";

export type CatalogFilterValue = {
  brandId: string | null;
  inStockOnly: boolean;
  sort: ProductSort;
};

export const defaultCatalogFilters: CatalogFilterValue = {
  brandId: null,
  inStockOnly: false,
  sort: "recommended",
};

function filterCount(value: CatalogFilterValue) {
  return Number(Boolean(value.brandId)) + Number(value.inStockOnly);
}

/**
 * A deliberately compact storefront control: filters stay out of the way until
 * a shopper asks for them, while sort remains a one-tap choice.
 */
export function CatalogFilters({
  brands,
  value,
  onChange,
}: {
  brands: CatalogBrandOption[];
  value: CatalogFilterValue;
  onChange: (next: CatalogFilterValue) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<CatalogFilterValue>(value);
  const [brandSearch, setBrandSearch] = useState("");
  const activeCount = filterCount(value);
  const selectedBrand = brands.find((brand) => brand.id === value.brandId);
  const filteredBrands = useMemo(() => {
    const needle = brandSearch.trim().toLocaleLowerCase();
    if (!needle) return brands;
    return brands.filter((brand) => brand.name.toLocaleLowerCase().includes(needle));
  }, [brandSearch, brands]);

  function openFilters() {
    setDraft(value);
    setBrandSearch("");
    setOpen(true);
  }

  function clearFilters() {
    const cleared = { ...defaultCatalogFilters, sort: value.sort };
    setDraft(cleared);
    onChange(cleared);
    setOpen(false);
  }

  return (
    <>
      <div className="mb-4 flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={openFilters}
          className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition-colors ${
            activeCount > 0
              ? "border-brand bg-brand text-white shadow-2xs"
              : "border-border bg-surface text-ink hover:border-brand/45"
          }`}
        >
          <SlidersHorizontal size={15} />
          Filters
          {activeCount > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-white/20 px-1 text-[10px]">
              {activeCount}
            </span>
          )}
        </button>

        <label className="relative flex h-9 min-w-0 flex-1 items-center rounded-xl border border-border bg-surface text-xs font-semibold text-ink shadow-2xs">
          <span className="shrink-0 pl-3 text-ink-muted">Sort:</span>
          <select
            aria-label="Sort products"
            value={value.sort}
            onChange={(event) =>
              onChange({ ...value, sort: event.target.value as ProductSort })
            }
            className="h-full min-w-0 flex-1 appearance-none bg-transparent px-1.5 pr-7 text-ink outline-none"
          >
            <option value="recommended">Recommended</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
          </select>
          <ChevronDown
            size={14}
            className="pointer-events-none absolute right-2.5 text-ink-muted"
            aria-hidden="true"
          />
        </label>

        {selectedBrand && (
          <button
            type="button"
            onClick={() => onChange({ ...value, brandId: null })}
            className="inline-flex h-9 max-w-[9rem] shrink items-center gap-1 rounded-xl border border-brand/25 bg-brand/6 px-2 text-xs font-semibold text-brand hover:bg-brand/10"
          >
            <span className="truncate">{selectedBrand.name}</span>
            <X size={13} className="shrink-0" aria-hidden="true" />
          </button>
        )}
      </div>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Filter products"
          className="fixed inset-0 z-[100] flex items-end bg-ink/35 p-0 sm:items-center sm:justify-center sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full rounded-t-3xl border border-border bg-surface shadow-2xl sm:max-w-md sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-5">
              <div>
                <h2 className="font-heading text-lg font-semibold text-ink">Filters</h2>
                <p className="mt-0.5 text-xs text-ink-muted">Narrow down the products you see.</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close filters"
                className="rounded-lg p-1.5 text-ink-muted hover:bg-background hover:text-ink"
              >
                <X size={19} />
              </button>
            </div>

            <div className="max-h-[65vh] overflow-y-auto px-4 py-4 sm:px-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-ink">Availability</h3>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={draft.inStockOnly}
                  onClick={() => setDraft((current) => ({ ...current, inStockOnly: !current.inStockOnly }))}
                  className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                    draft.inStockOnly
                      ? "border-brand bg-brand/8 text-brand"
                      : "border-border bg-surface text-ink-muted hover:border-brand/35"
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded border ${
                      draft.inStockOnly ? "border-brand bg-brand text-white" : "border-border"
                    }`}
                  >
                    {draft.inStockOnly && <Check size={11} strokeWidth={3} />}
                  </span>
                  In stock only
                </button>
              </div>

              {brands.length > 1 && (
                <div className="mt-6">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-bold text-ink">Brand</h3>
                    {draft.brandId && (
                      <button
                        type="button"
                        onClick={() => setDraft((current) => ({ ...current, brandId: null }))}
                        className="text-xs font-semibold text-brand hover:underline"
                      >
                        Clear brand
                      </button>
                    )}
                  </div>
                  <input
                    type="search"
                    value={brandSearch}
                    onChange={(event) => setBrandSearch(event.target.value)}
                    placeholder="Find a brand"
                    className="field mt-2 rounded-xl py-2 text-sm"
                  />
                  <div className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-border/80 p-1">
                    <button
                      type="button"
                      onClick={() => setDraft((current) => ({ ...current, brandId: null }))}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-medium ${
                        draft.brandId === null ? "bg-brand/8 text-brand" : "text-ink hover:bg-background"
                      }`}
                    >
                      All brands
                      {draft.brandId === null && <Check size={16} strokeWidth={2.5} />}
                    </button>
                    {filteredBrands.map((brand) => {
                      const selected = draft.brandId === brand.id;
                      return (
                        <button
                          key={brand.id}
                          type="button"
                          onClick={() => setDraft((current) => ({ ...current, brandId: brand.id }))}
                          className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-medium ${
                            selected ? "bg-brand/8 text-brand" : "text-ink hover:bg-background"
                          }`}
                        >
                          <span className="truncate">{brand.name}</span>
                          {selected && <Check size={16} className="shrink-0" strokeWidth={2.5} />}
                        </button>
                      );
                    })}
                    {filteredBrands.length === 0 && (
                      <p className="px-3 py-5 text-center text-xs text-ink-muted">No matching brand.</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 border-t border-border p-3 sm:p-4">
              <button type="button" onClick={clearFilters} className="btn-secondary flex-1 py-2.5 text-xs">
                Clear all
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange(draft);
                  setOpen(false);
                }}
                className="btn-primary flex-1 py-2.5 text-xs"
              >
                Show products
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
