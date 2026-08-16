"use client";

import { useState } from "react";
import Image from "next/image";
import { Package } from "lucide-react";

export function ProductThumbnail({
  src,
  alt = "",
  size = 40,
  className = "",
}: {
  src?: string | null;
  alt?: string;
  size?: number;
  className?: string;
}) {
  const [error, setError] = useState(false);

  if (!src || error) {
    return <Package size={Math.round(size * 0.4)} className="text-border" aria-hidden="true" />;
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      className={`object-contain p-0.5 ${className}`}
      sizes={`${size}px`}
      unoptimized
      onError={() => setError(true)}
    />
  );
}
