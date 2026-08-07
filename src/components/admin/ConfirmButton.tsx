"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/admin/Toast";

/**
 * Destructive action with an inline two-step confirm, replacing the browser
 * `confirm()`/`alert()` dialogs the demo used everywhere.
 *
 * Server-side guards produce a 409 with a message naming exactly what's
 * blocking (products, subcategories); that message is what gets surfaced.
 */
export function ConfirmButton({
  endpoint,
  label = "Delete",
  confirmLabel = "Confirm",
  successMessage = "Deleted",
  onDone,
}: {
  endpoint: string;
  label?: string;
  confirmLabel?: string;
  successMessage?: string;
  onDone?: () => void;
}) {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const { show } = useToast();

  async function run() {
    setBusy(true);
    try {
      const res = await fetch(endpoint, { method: "DELETE" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        show(body.error ?? "Couldn't delete that.", "error");
        setArmed(false);
        return;
      }
      show(successMessage);
      onDone?.();
      router.refresh();
    } catch {
      show("Network problem — try again.", "error");
    } finally {
      setBusy(false);
      setArmed(false);
    }
  }

  if (!armed) {
    return (
      <button
        onClick={() => setArmed(true)}
        className="text-caption text-ink-muted underline underline-offset-2 hover:text-ink"
      >
        {label}
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        onClick={run}
        disabled={busy}
        className="text-caption font-medium text-accent underline underline-offset-2 disabled:opacity-50"
      >
        {busy ? "Working…" : confirmLabel}
      </button>
      <button
        onClick={() => setArmed(false)}
        className="text-caption text-ink-muted underline underline-offset-2 hover:text-ink"
      >
        Cancel
      </button>
    </span>
  );
}
