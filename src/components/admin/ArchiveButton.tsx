"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/admin/Toast";

export function ArchiveButton({
  productId,
  isArchived,
  onDone,
}: {
  productId: string;
  isArchived: boolean;
  onDone?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const { show } = useToast();

  async function toggle() {
    setBusy(true);
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: !isArchived }),
      });

      if (!res.ok) {
        show("Couldn't update archive status.", "error");
        return;
      }

      show(isArchived ? "Product un-archived & restored to store" : "Product archived (hidden from store)");
      onDone?.();
      router.refresh();
    } catch {
      show("Network error — try again.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`text-caption underline underline-offset-2 disabled:opacity-50 ${
        isArchived
          ? "text-brand font-medium hover:text-ink"
          : "text-amber-700 hover:text-amber-900"
      }`}
    >
      {busy ? "Working…" : isArchived ? "Un-archive" : "Archive"}
    </button>
  );
}
