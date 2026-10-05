"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArchiveRestore,
  ChevronDown,
  FolderInput,
  ImageIcon,
  MoreHorizontal,
  Package,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { formatPrice } from "@/lib/pricing";
import { useToast } from "@/components/admin/Toast";
import type { ProductCardData } from "@/components/ProductCard";
import type { CategoryOption } from "@/components/admin/ProductForm";

export type AdminProductCardData = ProductCardData & { isArchived: boolean };

export function AdminProductCard({
  product,
  categoryId,
  categories,
  onRemoved,
}: {
  product: AdminProductCardData;
  /** The subcategory shelf this card currently belongs to. */
  categoryId: string;
  categories: CategoryOption[];
  /** Remove the card from its current shelf after archive, restore, move, or delete. */
  onRemoved?: (productId: string) => void;
}) {
  const [imageError, setImageError] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState<"archive" | "delete" | "category-image" | null>(null);
  const router = useRouter();
  const { show } = useToast();

  const hasDiscount = product.mrp != null && product.mrp > product.price;
  const discountPercent = hasDiscount
    ? Math.round(((product.mrp! - product.price) / product.mrp!) * 100)
    : 0;
  const editHref = `/admin/products/${product.id}/edit`;

  async function setArchiveState() {
    setBusy("archive");
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: !product.isArchived }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        show(body.error ?? "Couldn't update archive status.", "error");
        return;
      }

      show(
        product.isArchived
          ? "Product restored to the active catalog"
          : "Product archived and hidden from the storefront",
      );
      onRemoved?.(product.id);
      router.refresh();
    } catch {
      show("Network problem — try again.", "error");
    } finally {
      setBusy(null);
      setMenuOpen(false);
    }
  }

  async function deleteProduct() {
    setBusy("delete");
    try {
      const res = await fetch(`/api/products/${product.id}`, { method: "DELETE" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        show(body.error ?? "Couldn't delete that product.", "error");
        return;
      }

      show(`“${product.name}” was permanently deleted`);
      onRemoved?.(product.id);
      router.refresh();
    } catch {
      show("Network problem — try again.", "error");
    } finally {
      setBusy(null);
      setConfirmingDelete(false);
      setMenuOpen(false);
    }
  }

  async function setCategoryImage() {
    if (!product.imageUrl) return;

    setBusy("category-image");
    try {
      const res = await fetch(`/api/categories/${categoryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: product.imageUrl }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        show(body.error ?? "Couldn't set the subcategory image.", "error");
        return;
      }

      show(`“${product.name}” is now this subcategory's image`);
      router.refresh();
    } catch {
      show("Network problem — try again.", "error");
    } finally {
      setBusy(null);
      setMenuOpen(false);
    }
  }

  return (
    <article
      className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-surface shadow-xs transition-all hover:border-brand/40 hover:shadow-md ${
        product.isArchived ? "border-amber-300/70" : "border-border/80"
      }`}
    >
      <div className="relative aspect-square w-full shrink-0 bg-background/50">
        {hasDiscount && discountPercent > 0 && (
          <div className="absolute left-2 top-2 z-10 rounded-md bg-emerald-600 px-1.5 py-0.5 text-[9px] font-bold tracking-tight text-white shadow-xs sm:text-[10px]">
            {discountPercent}% OFF
          </div>
        )}

        {product.isArchived && (
          <div className="absolute bottom-2 left-2 z-10 rounded-md border border-amber-500/30 bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-amber-900 sm:text-[10px]">
            ARCHIVED
          </div>
        )}

        <Link
          href={editHref}
          aria-label={`Edit ${product.name}`}
          className="relative flex h-full w-full items-center justify-center p-2 sm:p-3.5"
        >
          {product.imageUrl && !imageError ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className={`object-contain p-2 transition-transform duration-300 group-hover:scale-105 ${
                product.isArchived ? "opacity-75" : ""
              }`}
              sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 20vw"
              unoptimized
              onError={() => setImageError(true)}
            />
          ) : (
            <Package size={32} className="text-border" aria-hidden="true" />
          )}

          {!product.inStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-surface/80 backdrop-blur-xs">
              <span className="rounded-md border border-border bg-surface px-2 py-1 text-[10px] font-medium text-ink-muted">
                Out of stock
              </span>
            </div>
          )}
        </Link>

        <div className="absolute right-1.5 top-1.5 z-30 sm:right-2 sm:top-2">
          <button
            type="button"
            aria-label={`More actions for ${product.name}`}
            aria-expanded={menuOpen}
            onClick={() => {
              setMenuOpen((open) => !open);
              setConfirmingDelete(false);
            }}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-border/90 bg-surface/95 text-ink-muted shadow-xs transition-colors hover:border-brand/40 hover:text-brand"
          >
            <MoreHorizontal size={17} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-10 w-52 rounded-xl border border-border bg-surface p-1.5 text-left shadow-lg">
              {confirmingDelete ? (
                <div className="p-2">
                  <p className="text-xs font-semibold leading-snug text-ink">Delete permanently?</p>
                  <p className="mt-1 text-[11px] leading-snug text-ink-muted">
                    This cannot be undone. Its image is removed too if no other product uses it.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmingDelete(false)}
                      className="flex-1 rounded-lg border border-border px-2 py-1.5 text-xs font-medium text-ink-muted hover:bg-background"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={deleteProduct}
                      disabled={busy === "delete"}
                      className="flex-1 rounded-lg bg-red-700 px-2 py-1.5 text-xs font-medium text-white hover:bg-red-800 disabled:opacity-50"
                    >
                      {busy === "delete" ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <Link
                    href={editHref}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-ink hover:bg-background"
                    onClick={() => setMenuOpen(false)}
                  >
                    <Pencil size={14} className="text-brand" />
                    Edit product
                  </Link>
                  <button
                    type="button"
                    onClick={setCategoryImage}
                    disabled={!product.imageUrl || busy === "category-image"}
                    title={
                      product.imageUrl
                        ? "Use this product image for the current subcategory"
                        : "This product has no image to use"
                    }
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-ink hover:bg-background disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <ImageIcon size={14} className="text-brand" />
                    {busy === "category-image" ? "Setting image…" : "Set as subcategory image"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMoveOpen(true)}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-ink hover:bg-background"
                  >
                    <FolderInput size={14} className="text-brand" />
                    Move to category
                  </button>
                  <button
                    type="button"
                    onClick={setArchiveState}
                    disabled={busy === "archive"}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-ink hover:bg-background disabled:opacity-50"
                  >
                    {product.isArchived ? (
                      <ArchiveRestore size={14} className="text-brand" />
                    ) : (
                      <Archive size={14} className="text-amber-700" />
                    )}
                    {busy === "archive"
                      ? "Working…"
                      : product.isArchived
                        ? "Restore to catalog"
                        : "Archive product"}
                  </button>
                  <div className="my-1 border-t border-border" />
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(true)}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-red-700 hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                    Delete permanently
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <Link
          href={editHref}
          aria-label={`Edit ${product.name}`}
          className="absolute bottom-1.5 right-1.5 z-10 flex h-8.5 w-8.5 items-center justify-center rounded-xl border-2 border-brand bg-surface text-brand shadow-md transition-all hover:bg-brand hover:text-white active:scale-90 sm:bottom-2 sm:right-2 sm:h-9.5 sm:w-9.5"
        >
          <Pencil size={16} className="stroke-[2.5]" />
        </Link>
      </div>

      <div className="flex flex-1 flex-col justify-between p-2 sm:p-3">
        <div>
          {product.brand && (
            <span className="block text-[9px] font-bold uppercase tracking-wider text-ink-muted sm:text-[10px]">
              {product.brand.name}
            </span>
          )}
          <h3 className="mt-0.5 line-clamp-2 text-xs font-semibold leading-snug text-ink sm:text-sm">
            <Link href={editHref} className="hover:text-brand">
              {product.name}
            </Link>
          </h3>
          {product.variant && (
            <div className="mt-1 inline-block rounded border border-border/80 bg-background px-1.5 py-0.5 text-[9px] font-medium text-ink-muted sm:text-[10px]">
              {product.variant}
            </div>
          )}
        </div>

        <div className="mt-2 border-t border-border/50 pt-1">
          {hasDiscount && discountPercent > 0 && (
            <span className="block text-[10px] font-bold text-emerald-600">{discountPercent}% OFF</span>
          )}
          <div className="flex items-baseline gap-1.5">
            <span className="price text-xs font-bold text-ink sm:text-sm">{formatPrice(product.price)}</span>
            {hasDiscount && (
              <span className="price text-[10px] text-ink-muted line-through sm:text-[11px]">
                {formatPrice(product.mrp!)}
              </span>
            )}
          </div>
        </div>
      </div>

      <MoveProductDialog
        product={product}
        categories={categories}
        open={moveOpen}
        onClose={() => setMoveOpen(false)}
        onMoved={() => {
          setMoveOpen(false);
          setMenuOpen(false);
          onRemoved?.(product.id);
          router.refresh();
        }}
      />
    </article>
  );
}

function MoveProductDialog({
  product,
  categories,
  open,
  onClose,
  onMoved,
}: {
  product: AdminProductCardData;
  categories: CategoryOption[];
  open: boolean;
  onClose: () => void;
  onMoved: () => void;
}) {
  const [categoryId, setCategoryId] = useState("");
  const [busy, setBusy] = useState(false);
  const { show } = useToast();

  const grouped = useMemo(
    () =>
      categories.reduce<Record<string, CategoryOption[]>>((groups, category) => {
        (groups[category.parentName] ??= []).push(category);
        return groups;
      }, {}),
    [categories],
  );

  if (!open) return null;

  async function moveProduct() {
    if (!categoryId) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        show(body.error ?? "Couldn't move that product.", "error");
        return;
      }
      show("Product moved to its new category");
      onMoved();
    } catch {
      show("Network problem — try again.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={`move-${product.id}`}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/30 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id={`move-${product.id}`} className="font-heading text-lg font-semibold text-ink">
              Move product
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-ink-muted">
              Choose the new category and subcategory for “{product.name}”.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close move product dialog"
            className="rounded-lg p-1 text-ink-muted hover:bg-background hover:text-ink disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <label htmlFor={`move-category-${product.id}`} className="label mt-5">
          New category
        </label>
        <div className="relative">
          <select
            id={`move-category-${product.id}`}
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            className="field appearance-none pr-10"
            disabled={busy}
          >
            <option value="">Choose a subcategory</option>
            {Object.entries(grouped).map(([parentName, options]) => (
              <optgroup key={parentName} label={parentName}>
                {options.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted" size={16} />
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="btn-secondary py-2 text-xs">
            Cancel
          </button>
          <button
            type="button"
            onClick={moveProduct}
            disabled={!categoryId || busy}
            className="btn-primary py-2 text-xs"
          >
            {busy ? "Moving…" : "Move product"}
          </button>
        </div>
      </div>
    </div>
  );
}
