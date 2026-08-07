"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/admin/Toast";
import { ImageField } from "@/components/admin/ImageField";

export function BrandEditForm({
  brand,
}: {
  brand: { id: string; name: string; logoUrl: string | null; isActive: boolean };
}) {
  const [name, setName] = useState(brand.name);
  const [logoUrl, setLogoUrl] = useState(brand.logoUrl ?? "");
  const [isActive, setIsActive] = useState(brand.isActive);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const { show } = useToast();

  async function onSubmit(e: React.FormEvent) {
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
        show(body.error ?? "Couldn't save.", "error");
        return;
      }

      show("Brand saved");
      router.push("/admin/brands");
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
      </div>

      <ImageField value={logoUrl} onChange={setLogoUrl} label="Logo" />

      <label className="flex items-center gap-2 border-t border-border pt-4 text-body">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
        />
        Show this brand on the shop
      </label>

      <div className="flex gap-3 border-t border-border pt-5">
        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? "Saving…" : "Save changes"}
        </button>
        <Link href="/admin/brands" className="btn-secondary">
          Cancel
        </Link>
      </div>
    </form>
  );
}
