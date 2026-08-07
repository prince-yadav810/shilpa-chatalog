"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/admin/Toast";

export function AddCategoryForm({
  parents,
}: {
  parents: { id: string; name: string; hasProducts: boolean }[];
}) {
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const { show } = useToast();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);

    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, parentId: parentId || null }),
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        show(body.error ?? "Couldn't add that category.", "error");
        return;
      }

      show(`"${name}" added`);
      setName("");
      router.refresh();
    } catch {
      show("Network problem — try again.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
      <div>
        <label htmlFor="new-category" className="label">
          Category name
        </label>
        <input
          id="new-category"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tubs"
          className="field w-56"
          required
        />
      </div>

      <div>
        <label htmlFor="new-category-parent" className="label">
          Inside
        </label>
        <select
          id="new-category-parent"
          value={parentId}
          onChange={(e) => setParentId(e.target.value)}
          className="field w-56"
        >
          <option value="">Nothing — make it top level</option>
          {parents.map((parent) => (
            <option key={parent.id} value={parent.id} disabled={parent.hasProducts}>
              {parent.name}
              {parent.hasProducts ? " (holds products)" : ""}
            </option>
          ))}
        </select>
      </div>

      <button type="submit" disabled={busy} className="btn-primary">
        {busy ? "Adding…" : "Add category"}
      </button>
    </form>
  );
}
