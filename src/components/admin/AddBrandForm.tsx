"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/admin/Toast";

export function AddBrandForm() {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const { show } = useToast();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);

    try {
      const res = await fetch("/api/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        show(body.fields?.name ?? body.error ?? "Couldn't add that brand.", "error");
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
        <label htmlFor="new-brand" className="label">
          Brand name
        </label>
        <input
          id="new-brand"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Amul"
          className="field w-56"
          required
        />
      </div>
      <button type="submit" disabled={busy} className="btn-primary">
        {busy ? "Adding…" : "Add brand"}
      </button>
    </form>
  );
}
