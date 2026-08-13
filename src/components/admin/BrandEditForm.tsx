"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/admin/Toast";
import { ImageField } from "@/components/admin/ImageField";
import { ConfirmButton } from "@/components/admin/ConfirmButton";

export type ProductItem = {
  id: string;
  name: string;
  slug: string;
  price: number;
  mrp: number | null;
  variant: string | null;
  imageUrl: string | null;
  isArchived: boolean;
  inStock: boolean;
  categoryName: string;
};

export function BrandEditForm({
  brand,
  products = [],
}: {
  brand: { id: string; name: string; logoUrl: string | null; isActive: boolean };
  products?: ProductItem[];
}) {
  const [name, setName] = useState(brand.name);
  const [logoUrl, setLogoUrl] = useState(brand.logoUrl ?? "");
  const [isActive, setIsActive] = useState(brand.isActive);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  // Bulk Discount state
  const [discountPercent, setDiscountPercent] = useState<string>("2");
  const [discounting, setDiscounting] = useState(false);

  // Product Filter & Local State
  const [productList, setProductList] = useState<ProductItem[]>(products);
  const [searchQuery, setSearchQuery] = useState("");
  const [archivingId, setArchivingId] = useState<string | null>(null);

  const router = useRouter();
  const { show } = useToast();

  async function onSubmitBrand(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});

    try {
      const res = await fetch(`/api/brands/${brand.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, logoUrl: logoUrl || null, isActive }),
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrors(body.fields ?? {});
        show(body.error ?? "Couldn't save brand.", "error");
        return;
      }

      show("Brand details saved");
      router.push("/admin/brands");
      router.refresh();
    } catch {
      show("Network problem — try again.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleApplyBulkDiscount(e: React.FormEvent) {
    e.preventDefault();
    const percent = parseFloat(discountPercent);
    if (isNaN(percent) || percent < 0 || percent > 99) {
      show("Enter a valid discount percentage between 0 and 99.", "error");
      return;
    }

    setDiscounting(true);
    try {
      const res = await fetch(`/api/brands/${brand.id}/discount`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discountPercent: percent }),
      });
      const data = await res.json();

      if (!res.ok) {
        show(data.error || "Failed to apply bulk discount.", "error");
        return;
      }

      show(data.message || `Applied ${percent}% discount!`);

      // Update local product list prices
      setProductList((prev) =>
        prev.map((p) => {
          const baseMrp = p.mrp && p.mrp > p.price ? p.mrp : p.price;
          const newPrice = Math.max(1, Math.round(baseMrp * (1 - percent / 100)));
          return {
            ...p,
            mrp: baseMrp,
            price: newPrice,
          };
        })
      );

      router.refresh();
    } catch {
      show("Network error applying bulk discount.", "error");
    } finally {
      setDiscounting(false);
    }
  }

  async function toggleArchive(product: ProductItem) {
    setArchivingId(product.id);
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: !product.isArchived }),
      });
      if (!res.ok) {
        show("Failed to update archive status.", "error");
        return;
      }
      show(product.isArchived ? `Unarchived "${product.name}"` : `Archived "${product.name}"`);
      setProductList((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, isArchived: !p.isArchived } : p))
      );
      router.refresh();
    } catch {
      show("Network error toggling archive.", "error");
    } finally {
      setArchivingId(null);
    }
  }



  const filteredProducts = productList.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-10">
      {/* 1. BRAND DETAILS FORM & BULK DISCOUNT SIDE BY SIDE */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Brand Main Form */}
        <form onSubmit={onSubmitBrand} className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-6 shadow-xs">
          <h2 className="font-heading text-lg font-bold text-ink">Brand Settings</h2>
          <div>
            <label htmlFor="name" className="label">
              Brand Name
            </label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="field"
              required
            />
            {errors.name && <p className="mt-1 text-caption text-accent">{errors.name}</p>}
          </div>

          <ImageField value={logoUrl} onChange={setLogoUrl} label="Brand Logo" />

          <label className="flex items-center gap-2 border-t border-border pt-4 text-body">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            Show this brand on the shop catalog
          </label>

          <div className="flex gap-3 border-t border-border pt-4">
            <button type="submit" disabled={busy} className="btn-primary">
              {busy ? "Saving…" : "Save Brand Settings"}
            </button>
            <Link href="/admin/brands" className="btn-secondary">
              Cancel
            </Link>
          </div>
        </form>

        {/* Bulk Brand Discount Tool */}
        <div className="flex flex-col justify-between rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 shadow-xs">
          <div>
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <span className="text-xl">⚡</span>
              <h2 className="font-heading text-lg font-bold">Bulk Discount Tool</h2>
            </div>
            <p className="mt-2 text-sm text-ink-muted leading-relaxed">
              Apply a percentage discount across <strong>all {productList.length} products</strong> of{" "}
              <strong>{brand.name}</strong> in one click. Selling prices will be automatically calculated off MRP.
            </p>

            <form onSubmit={handleApplyBulkDiscount} className="mt-6 flex flex-col gap-4">
              <div>
                <label className="label text-ink font-semibold">Discount Percentage (%)</label>
                <div className="relative mt-1 max-w-xs">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="99"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(e.target.value)}
                    placeholder="e.g. 2, 5, 10, 15"
                    className="field pr-8 font-semibold"
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-ink-muted">
                    %
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={discounting || productList.length === 0}
                className="btn-primary bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 px-5 rounded-xl transition shadow-sm disabled:opacity-50"
              >
                {discounting
                  ? "Applying Discount to All Products…"
                  : `Apply ${discountPercent || 0}% Discount to All ${productList.length} Products`}
              </button>
            </form>
          </div>

          <div className="mt-6 rounded-xl border border-emerald-500/30 bg-surface p-4 text-xs text-ink-muted">
            💡 <strong>Example:</strong> Setting <code>2%</code> discount recalculates selling prices for all {brand.name} products off their MRP.
          </div>
        </div>
      </div>

      {/* 2. ALL BRAND PRODUCTS LIST WITH LARGE THUMBNAILS & DIRECT QUICK ACTIONS */}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h2 className="font-heading text-xl font-bold text-ink">
              All Products for {brand.name} ({productList.length})
            </h2>
            <p className="text-sm text-ink-muted">
              Manage products, view large artwork, edit details, or toggle archive/delete status directly.
            </p>
          </div>

          {/* Search Filter */}
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              placeholder="Search brand products…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="field text-sm py-2"
            />
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center text-ink-muted">
            No products found matching &quot;{searchQuery}&quot;.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredProducts.map((p) => {
              const discountVal = p.mrp && p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;

              return (
                <div
                  key={p.id}
                  className={`flex flex-col gap-4 rounded-xl border p-4 transition sm:flex-row sm:items-center sm:justify-between ${
                    p.isArchived
                      ? "border-amber-500/30 bg-amber-500/5 opacity-75"
                      : "border-border bg-surface hover:border-brand/40 shadow-xs"
                  }`}
                >
                  {/* LARGE PRODUCT IMAGE THUMBNAIL & INFO */}
                  <div className="flex items-center gap-4 sm:gap-6">
                    {/* Large 96x96 Image Container */}
                    <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-border bg-surface p-1 shadow-xs">
                      {p.imageUrl ? (
                        <Image
                          src={p.imageUrl}
                          alt={p.name}
                          fill
                          sizes="96px"
                          className="object-contain"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-surface-subtle text-caption text-ink-muted">
                          No Image
                        </div>
                      )}
                    </div>

                    {/* Product Details */}
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-brand bg-brand/10 px-2 py-0.5 rounded-md">
                          {p.categoryName}
                        </span>
                        {p.variant && (
                          <span className="text-xs font-medium text-ink-muted bg-surface-subtle border border-border px-2 py-0.5 rounded-md">
                            {p.variant}
                          </span>
                        )}
                        {p.isArchived && (
                          <span className="text-xs font-bold text-amber-600 bg-amber-100 dark:bg-amber-950 dark:text-amber-300 px-2 py-0.5 rounded-md">
                            Archived
                          </span>
                        )}
                      </div>

                      <h3 className="font-heading text-base font-bold text-ink leading-snug">
                        {p.name}
                      </h3>

                      <div className="flex items-center gap-3 pt-1">
                        <span className="text-base font-extrabold text-brand">
                          ₹{p.price.toLocaleString("en-IN")}
                        </span>
                        {p.mrp && p.mrp > p.price && (
                          <span className="text-sm text-ink-muted line-through">
                            ₹{p.mrp.toLocaleString("en-IN")}
                          </span>
                        )}
                        {discountVal > 0 && (
                          <span className="text-xs font-extrabold text-emerald-600 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-400 px-1.5 py-0.5 rounded">
                            {discountVal}% OFF
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* DIRECT QUICK ACTIONS: EDIT, ARCHIVE/UNARCHIVE, DELETE */}
                  <div className="flex items-center gap-2 border-t border-border pt-3 sm:border-t-0 sm:pt-0">
                    {/* EDIT BUTTON */}
                    <Link
                      href={`/admin/products/${p.id}/edit`}
                      className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
                    >
                      ✏️ Edit
                    </Link>

                    {/* ARCHIVE / UNARCHIVE BUTTON */}
                    <button
                      type="button"
                      disabled={archivingId === p.id}
                      onClick={() => toggleArchive(p)}
                      className={`text-xs py-2 px-3 rounded-lg font-medium transition ${
                        p.isArchived
                          ? "bg-amber-600 text-white hover:bg-amber-700"
                          : "bg-surface-subtle border border-border text-ink-muted hover:text-ink hover:bg-surface"
                      }`}
                    >
                      {archivingId === p.id
                        ? "Saving…"
                        : p.isArchived
                        ? "📦 Un-archive"
                        : "📦 Archive"}
                    </button>

                    {/* DELETE BUTTON WITH CONFIRMATION */}
                    <ConfirmButton
                      endpoint={`/api/products/${p.id}`}
                      label="🗑️ Delete"
                      confirmLabel="Confirm Delete"
                      successMessage={`Deleted "${p.name}"`}
                      onDone={() =>
                        setProductList((prev) => prev.filter((x) => x.id !== p.id))
                      }
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
