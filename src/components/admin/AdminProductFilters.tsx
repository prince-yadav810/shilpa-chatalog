"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function AdminProductFilters({
  categories,
}: {
  categories: { id: string; label: string }[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");

  function apply(next: Record<string, string | undefined>) {
    const search = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) search.set(key, value);
      else search.delete(key);
    }
    // Any filter change invalidates the current page number.
    search.delete("page");
    const qs = search.toString();
    router.push(qs ? `/admin/products?${qs}` : "/admin/products");
  }

  return (
    <form
      className="flex flex-wrap gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        apply({ q: q.trim() || undefined });
      }}
    >
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search name, code or pack size"
        aria-label="Search products"
        className="field max-w-xs"
      />

      <select
        value={params.get("category") ?? ""}
        onChange={(e) => apply({ category: e.target.value || undefined })}
        aria-label="Filter by category"
        className="field max-w-xs"
      >
        <option value="">All categories</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
          </option>
        ))}
      </select>

      <select
        value={params.get("stock") ?? ""}
        onChange={(e) => apply({ stock: e.target.value || undefined })}
        aria-label="Filter by stock"
        className="field max-w-[10rem]"
      >
        <option value="">Any stock</option>
        <option value="in">In stock</option>
        <option value="out">Out of stock</option>
      </select>

      <button type="submit" className="btn-secondary">
        Search
      </button>
    </form>
  );
}
