"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/admin/Toast";
import { ImageField } from "@/components/admin/ImageField";

export function CategoryEditForm({
  category,
  parents,
}: {
  category: {
    id: string;
    name: string;
    parentId: string | null;
    imageUrl: string | null;
    sortOrder: number;
    isActive: boolean;
    hasChildren: boolean;
  };
  parents: { id: string; name: string }[];
}) {
  const [name, setName] = useState(category.name);
  const [parentId, setParentId] = useState(category.parentId ?? "");
  const [imageUrl, setImageUrl] = useState(category.imageUrl ?? "");
  const [isActive, setIsActive] = useState(category.isActive);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const { show } = useToast();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});

    try {
      const res = await fetch(`/api/categories/${category.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          parentId: parentId || null,
          imageUrl: imageUrl || null,
          sortOrder: category.sortOrder,
          isActive,
        }),
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrors(body.fields ?? {});
        show(body.error ?? "Couldn't save.", "error");
        return;
      }

      show("Category saved");
      router.push("/admin/categories");
      router.refresh();
    } catch {
      show("Network problem — try again.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-xl flex-col gap-5">
      <div>
        <label htmlFor="name" className="label">
          Name
        </label>
        <input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="field"
          required
        />
        {errors.name && <p className="mt-1 text-caption text-accent">{errors.name}</p>}
        <p className="mt-1 text-caption text-ink-muted">
          The web address doesn&rsquo;t change when you rename — existing links
          keep working.
        </p>
      </div>

      <div>
        <label htmlFor="parentId" className="label">
          Inside
        </label>
        <select
          id="parentId"
          value={parentId}
          onChange={(e) => setParentId(e.target.value)}
          className="field"
          disabled={category.hasChildren}
        >
          <option value="">Nothing — top level</option>
          {parents.map((parent) => (
            <option key={parent.id} value={parent.id}>
              {parent.name}
            </option>
          ))}
        </select>
        {errors.parentId && (
          <p className="mt-1 text-caption text-accent">{errors.parentId}</p>
        )}
        {category.hasChildren && (
          <p className="mt-1 text-caption text-ink-muted">
            This category has subcategories of its own, so it has to stay at the
            top level.
          </p>
        )}
      </div>

      <ImageField
        value={imageUrl}
        onChange={setImageUrl}
        label="Tile image (shown on the homepage)"
      />

      <label className="flex items-center gap-2 border-t border-border pt-4 text-body">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
        />
        Show this category on the shop
      </label>

      <div className="flex gap-3 border-t border-border pt-5">
        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? "Saving…" : "Save changes"}
        </button>
        <Link href="/admin/categories" className="btn-secondary">
          Cancel
        </Link>
      </div>
    </form>
  );
}
