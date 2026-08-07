"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/admin/Toast";
import { formatDisplayNumber, normaliseNumber } from "@/lib/whatsapp";

export function SettingsForm({
  initial,
}: {
  initial: {
    storeName: string;
    whatsappNumber: string;
    promoBannerText: string;
    promoBannerLink: string;
  };
}) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const { show } = useToast();

  const preview = values.whatsappNumber
    ? formatDisplayNumber(normaliseNumber(values.whatsappNumber))
    : null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          promoBannerText: values.promoBannerText || null,
          promoBannerLink: values.promoBannerLink || null,
        }),
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrors(body.fields ?? {});
        show(body.error ?? "Couldn't save.", "error");
        return;
      }

      show("Settings saved — the shop updates straight away");
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
        <label htmlFor="storeName" className="label">
          Shop name
        </label>
        <input
          id="storeName"
          value={values.storeName}
          onChange={(e) => setValues((v) => ({ ...v, storeName: e.target.value }))}
          className="field"
          required
        />
        {errors.storeName && (
          <p className="mt-1 text-caption text-accent">{errors.storeName}</p>
        )}
      </div>

      <div>
        <label htmlFor="whatsappNumber" className="label">
          WhatsApp number for orders
        </label>
        <input
          id="whatsappNumber"
          value={values.whatsappNumber}
          onChange={(e) => setValues((v) => ({ ...v, whatsappNumber: e.target.value }))}
          placeholder="8591442334"
          className="field price max-w-xs text-left"
          required
        />
        {errors.whatsappNumber && (
          <p className="mt-1 text-caption text-accent">{errors.whatsappNumber}</p>
        )}
        <p className="mt-1 text-caption text-ink-muted">
          {preview ? `Customers will message ${preview}.` : "Enter the shop's number."}{" "}
          Indian numbers can be entered with or without +91. Changing this updates
          every order button on the shop immediately — no redeploy needed.
        </p>
      </div>

      <fieldset className="border-t border-border pt-5">
        <legend className="label">Homepage banner (optional)</legend>

        <input
          value={values.promoBannerText}
          onChange={(e) => setValues((v) => ({ ...v, promoBannerText: e.target.value }))}
          placeholder="Free delivery on orders above ₹500"
          aria-label="Banner text"
          className="field"
        />
        {errors.promoBannerText && (
          <p className="mt-1 text-caption text-accent">{errors.promoBannerText}</p>
        )}

        <input
          value={values.promoBannerLink}
          onChange={(e) => setValues((v) => ({ ...v, promoBannerLink: e.target.value }))}
          placeholder="/c/ice-cream-and-frozen-desserts (optional link)"
          aria-label="Banner link"
          className="field mt-2"
        />
        {errors.promoBannerLink && (
          <p className="mt-1 text-caption text-accent">{errors.promoBannerLink}</p>
        )}

        <p className="mt-1 text-caption text-ink-muted">
          Leave the text empty to hide the banner.
        </p>
      </fieldset>

      <div className="border-t border-border pt-5">
        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? "Saving…" : "Save settings"}
        </button>
      </div>
    </form>
  );
}
