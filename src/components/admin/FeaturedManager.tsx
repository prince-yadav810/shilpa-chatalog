"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChevronUp, ChevronDown, Package, X } from "lucide-react";
import { useToast } from "@/components/admin/Toast";

type Item = {
  id: string;
  name: string;
  variant: string | null;
  imageUrl: string | null;
  featuredOrder: number;
  categoryId: string;
  brandId: string | null;
  price: number;
  mrp: number | null;
  sku: string | null;
  description: string | null;
  inStock: boolean;
};

/**
 * Reorders and removes items from the homepage row. Each change is a normal
 * product update, so the same validation applies as in the product form.
 */
export function FeaturedManager({ items }: { items: Item[] }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const { show } = useToast();

  async function save(product: Item, changes: Partial<Item>) {
    setBusy(true);
    try {
      const merged = { ...product, ...changes };
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: merged.name,
          categoryId: merged.categoryId,
          brandId: merged.brandId,
          sku: merged.sku,
          price: merged.price,
          mrp: merged.mrp,
          variant: merged.variant,
          description: merged.description,
          imageUrl: merged.imageUrl,
          inStock: merged.inStock,
          isFeatured: changes.featuredOrder !== undefined ? true : false,
          featuredOrder: merged.featuredOrder,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        show(body.error ?? "Couldn't save.", "error");
        return;
      }
      router.refresh();
    } catch {
      show("Network problem — try again.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    // Swap the two orders; only these two rows change.
    await save(items[index], { featuredOrder: items[target].featuredOrder });
    await save(items[target], { featuredOrder: items[index].featuredOrder });
  }

  if (items.length === 0) {
    return (
      <p className="mt-6 border border-border bg-surface px-6 py-12 text-center text-body text-ink-muted">
        Nothing on the homepage row yet. Tick &ldquo;Show on the homepage&rdquo;
        when adding or editing a product.
      </p>
    );
  }

  return (
    <ul className="mt-6 border border-border bg-surface">
      {items.map((item, index) => (
        <li
          key={item.id}
          className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0"
        >
          <span className="inline-flex flex-col">
            <button
              onClick={() => move(index, -1)}
              disabled={index === 0 || busy}
              aria-label="Move up"
              className="p-0.5 text-ink-muted hover:text-ink disabled:opacity-25"
            >
              <ChevronUp size={14} />
            </button>
            <button
              onClick={() => move(index, 1)}
              disabled={index === items.length - 1 || busy}
              aria-label="Move down"
              className="p-0.5 text-ink-muted hover:text-ink disabled:opacity-25"
            >
              <ChevronDown size={14} />
            </button>
          </span>

          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center border border-border bg-background">
            {item.imageUrl ? (
              <Image
                src={item.imageUrl}
                alt=""
                fill
                className="object-contain p-0.5"
                sizes="40px"
              />
            ) : (
              <Package size={14} className="text-border" aria-hidden="true" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-body text-ink">{item.name}</p>
            {item.variant && (
              <p className="text-caption text-ink-muted">{item.variant}</p>
            )}
          </div>

          <button
            onClick={() => save(item, {})}
            disabled={busy}
            aria-label={`Remove ${item.name} from the homepage`}
            className="flex items-center gap-1 text-caption text-ink-muted hover:text-ink disabled:opacity-50"
          >
            <X size={14} />
            Remove
          </button>
        </li>
      ))}
    </ul>
  );
}
