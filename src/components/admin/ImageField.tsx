"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { useToast } from "@/components/admin/Toast";

/** Upload to Cloudinary, or paste a URL. Either way the value is a URL. */
export function ImageField({
  value,
  onChange,
  label = "Image",
}: {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { show } = useToast();

  async function upload(file: File) {
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        show(body.error ?? "Couldn't upload that image.", "error");
        return;
      }
      onChange(body.url);
      show("Image uploaded");
    } catch {
      show("Network problem — try again.", "error");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <span className="label">{label}</span>

      <div className="flex items-start gap-4">
        <div className="relative flex h-24 w-24 shrink-0 items-center justify-center border border-border bg-background">
          {value ? (
            <>
              <Image src={value} alt="" fill className="object-contain p-1" sizes="96px" />
              <button
                type="button"
                onClick={() => onChange("")}
                aria-label="Remove image"
                className="absolute -right-2 -top-2 border border-border bg-surface p-1 text-ink-muted hover:text-ink"
              >
                <X size={12} />
              </button>
            </>
          ) : (
            <span className="text-caption text-ink-muted">None</span>
          )}
        </div>

        <div className="flex-1">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="btn-secondary text-caption"
          >
            <Upload size={14} />
            {busy ? "Uploading…" : "Upload image"}
          </button>

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) upload(file);
            }}
          />

          <input
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="…or paste an image URL"
            className="field mt-2 text-caption"
          />
          <p className="mt-1 text-caption text-ink-muted">
            JPG, PNG or WebP, up to 8 MB. Uploaded images are stored on our own
            account, not linked from another site.
          </p>
        </div>
      </div>
    </div>
  );
}
