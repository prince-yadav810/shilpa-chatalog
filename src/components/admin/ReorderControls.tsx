"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronUp, ChevronDown } from "lucide-react";
import { useToast } from "@/components/admin/Toast";

/**
 * Up/down buttons rather than drag-and-drop: this list is short, it has to
 * work on a phone, and arrows are keyboard-accessible without extra work.
 * Ordering is written for the whole sibling group in one request.
 */
export function ReorderControls({
  siblings,
  id,
}: {
  siblings: { id: string }[];
  id: string;
}) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const { show } = useToast();

  const index = siblings.findIndex((s) => s.id === id);
  const canUp = index > 0;
  const canDown = index >= 0 && index < siblings.length - 1;

  async function move(direction: -1 | 1) {
    const next = [...siblings];
    const target = index + direction;
    [next[index], next[target]] = [next[target], next[index]];

    setBusy(true);
    try {
      const res = await fetch("/api/categories/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: next.map((s, i) => ({ id: s.id, sortOrder: i })),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        show(body.error ?? "Couldn't reorder.", "error");
        return;
      }
      router.refresh();
    } catch {
      show("Network problem — try again.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex">
      <button
        onClick={() => move(-1)}
        disabled={!canUp || busy}
        aria-label="Move up"
        className="p-1 text-ink-muted hover:text-ink disabled:opacity-25"
      >
        <ChevronUp size={14} />
      </button>
      <button
        onClick={() => move(1)}
        disabled={!canDown || busy}
        aria-label="Move down"
        className="p-1 text-ink-muted hover:text-ink disabled:opacity-25"
      >
        <ChevronDown size={14} />
      </button>
    </span>
  );
}
