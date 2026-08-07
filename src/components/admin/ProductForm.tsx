"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/admin/Toast";
import { ImageField } from "@/components/admin/ImageField";
import { discountPercent } from "@/lib/pricing";

export type CategoryOption = {
  id: string;
  name: string;
  parentName: string;
};

export type BrandOption = { id: string; name: string };

export type ProductFormValues = {
  id?: string;
  name: string;
  sku: string;
  categoryId: string;
  brandId: string;
  price: string;
  mrp: string;
  variant: string;
  description: string;
  imageUrl: string;
  inStock: boolean;
  isFeatured: boolean;
};

export const EMPTY_PRODUCT: ProductFormValues = {
  name: "",
  sku: "",
  categoryId: "",
  brandId: "",
  price: "",
  mrp: "",
  variant: "",
  description: "",
  imageUrl: "",
  inStock: true,
  isFeatured: false,
};

export function ProductForm({
  initial,
  categories,
  brands,
}: {
  initial: ProductFormValues;
  categories: CategoryOption[];
  brands: BrandOption[];
}) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const { show } = useToast();

  const isEdit = Boolean(initial.id);

  function set<K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => {
      if (!e[key as string]) return e;
      const next = { ...e };
      delete next[key as string];
      return next;
    });
  }

  // Group the flat option list back into <optgroup>s, so the admin picks a
  // subcategory in the context of its parent rather than from a flat list of
  // ambiguous names ("Tubs" under what?).
  const grouped = categories.reduce<Record<string, CategoryOption[]>>((acc, option) => {
    (acc[option.parentName] ??= []).push(option);
    return acc;
  }, {});

  const priceNum = Number.parseFloat(values.price);
  const mrpNum = Number.parseFloat(values.mrp);
  const off = discountPercent(priceNum, Number.isFinite(mrpNum) ? mrpNum : null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});

    const payload = {
      ...values,
      brandId: values.brandId || null,
      sku: values.sku || null,
      mrp: values.mrp === "" ? null : values.mrp,
      variant: values.variant || null,
      description: values.description || null,
      imageUrl: values.imageUrl || null,
    };

    try {
      const res = await fetch(
        isEdit ? `/api/products/${initial.id}` : "/api/products",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrors(body.fields ?? {});
        show(body.error ?? "Couldn't save.", "error");
        return;
      }

      show(isEdit ? "Product saved" : "Product added");
      router.push("/admin/products");
      router.refresh();
    } catch {
      show("Network problem — try again.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-2xl flex-col gap-5">
      <div>
        <label htmlFor="name" className="label">
          Product name
        </label>
        <input
          id="name"
          value={values.name}
          onChange={(e) => set("name", e.target.value)}
          className="field"
          required
        />
        <FieldError message={errors.name} />
        {isEdit && (
          <p className="mt-1 text-caption text-ink-muted">
            Renaming is safe — the product&rsquo;s web address stays the same, so
            links already shared on WhatsApp keep working.
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="categoryId" className="label">
            Category
          </label>
          <select
            id="categoryId"
            value={values.categoryId}
            onChange={(e) => set("categoryId", e.target.value)}
            className="field"
            required
          >
            <option value="">Choose a category</option>
            {Object.entries(grouped).map(([parent, options]) => (
              <optgroup key={parent} label={parent}>
                {options.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <FieldError message={errors.categoryId} />
          {categories.length === 0 && (
            <p className="mt-1 text-caption text-ink-muted">
              No subcategories exist yet.{" "}
              <Link href="/admin/categories" className="underline">
                Add one first
              </Link>
              .
            </p>
          )}
        </div>

        <div>
          <label htmlFor="brandId" className="label">
            Brand <span className="text-ink-muted">(optional)</span>
          </label>
          <select
            id="brandId"
            value={values.brandId}
            onChange={(e) => set("brandId", e.target.value)}
            className="field"
          >
            <option value="">No brand</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </select>
          <FieldError message={errors.brandId} />
          <p className="mt-1 text-caption text-ink-muted">
            <Link href="/admin/brands" className="underline">
              Manage brands
            </Link>
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="price" className="label">
            Selling price (₹)
          </label>
          <input
            id="price"
            type="number"
            step="0.01"
            min="0.01"
            value={values.price}
            onChange={(e) => set("price", e.target.value)}
            className="field price text-left"
            required
          />
          <FieldError message={errors.price} />
        </div>

        <div>
          <label htmlFor="mrp" className="label">
            MRP (₹) <span className="text-ink-muted">(optional)</span>
          </label>
          <input
            id="mrp"
            type="number"
            step="0.01"
            min="0"
            value={values.mrp}
            onChange={(e) => set("mrp", e.target.value)}
            className="field price text-left"
          />
          <FieldError message={errors.mrp} />
          <p className="mt-1 text-caption text-ink-muted">
            {off !== null
              ? `Shows as ${off}% off.`
              : "Only fill this in if the pack has a higher printed MRP."}
          </p>
        </div>

        <div>
          <label htmlFor="variant" className="label">
            Pack size
          </label>
          <input
            id="variant"
            value={values.variant}
            onChange={(e) => set("variant", e.target.value)}
            placeholder="500 ml"
            className="field"
          />
          <FieldError message={errors.variant} />
        </div>
      </div>

      <div>
        <label htmlFor="description" className="label">
          Description <span className="text-ink-muted">(optional)</span>
        </label>
        <textarea
          id="description"
          value={values.description}
          onChange={(e) => set("description", e.target.value)}
          rows={4}
          className="field"
        />
        <FieldError message={errors.description} />
      </div>

      <ImageField value={values.imageUrl} onChange={(url) => set("imageUrl", url)} />
      <FieldError message={errors.imageUrl} />

      <div>
        <label htmlFor="sku" className="label">
          Product code <span className="text-ink-muted">(optional)</span>
        </label>
        <input
          id="sku"
          value={values.sku}
          onChange={(e) => set("sku", e.target.value)}
          className="field price max-w-xs text-left"
        />
        <FieldError message={errors.sku} />
        <p className="mt-1 text-caption text-ink-muted">
          The distributor&rsquo;s code. Set automatically for imported products —
          leave it alone unless you know it.
        </p>
      </div>

      <fieldset className="flex flex-col gap-2 border-t border-border pt-4">
        <label className="flex items-center gap-2 text-body">
          <input
            type="checkbox"
            checked={values.inStock}
            onChange={(e) => set("inStock", e.target.checked)}
          />
          In stock
        </label>
        <label className="flex items-center gap-2 text-body">
          <input
            type="checkbox"
            checked={values.isFeatured}
            onChange={(e) => set("isFeatured", e.target.checked)}
          />
          Show on the homepage
        </label>
      </fieldset>

      <div className="flex gap-3 border-t border-border pt-5">
        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? "Saving…" : isEdit ? "Save changes" : "Add product"}
        </button>
        <Link href="/admin/products" className="btn-secondary">
          Cancel
        </Link>
      </div>
    </form>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1 text-caption text-accent">
      {message}
    </p>
  );
}
