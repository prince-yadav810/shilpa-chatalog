"use client";

import { useState } from "react";
import Image from "next/image";
import { Package } from "lucide-react";

export function ProductDetailImage({
  imageUrl,
  name,
  inStock,
}: {
  imageUrl?: string | null;
  name: string;
  inStock: boolean;
}) {
  const [error, setError] = useState(false);

  return (
    <div className="relative flex aspect-square w-full items-center justify-center rounded-2xl border border-border/80 bg-surface shadow-xs p-4 sm:p-8 overflow-hidden">
      {imageUrl && !error ? (
        <Image
          src={imageUrl}
          alt={name}
          fill
          className="object-contain p-4 sm:p-6"
          sizes="(max-width: 768px) 100vw, 50vw"
          priority
          unoptimized
          onError={() => setError(true)}
        />
      ) : (
        <Package size={54} className="text-border" aria-hidden="true" />
      )}

      {!inStock && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface/80 backdrop-blur-xs">
          <span className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-bold text-ink-muted">
            Out of stock
          </span>
        </div>
      )}
    </div>
  );
}
