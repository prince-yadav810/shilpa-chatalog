"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useToast } from "@/components/admin/Toast";

interface DeleteBrandModalProps {
  brand: {
    id: string;
    name: string;
    logoUrl?: string | null;
    _count?: { products: number };
  };
}

export function DeleteBrandModal({ brand }: DeleteBrandModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  const { show } = useToast();

  const productCount = brand._count?.products ?? 0;

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/brands/${brand.id}`, {
        method: "DELETE",
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        show(body.error ?? "Failed to delete brand.", "error");
        setIsDeleting(false);
        return;
      }

      show(`"${brand.name}" and all ${productCount} products were deleted.`);
      setIsOpen(false);
      router.refresh();
    } catch {
      show("Network error — please try again.", "error");
      setIsDeleting(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="text-caption font-medium text-red-600 underline underline-offset-2 hover:text-red-700"
      >
        Delete
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full max-w-md rounded-lg border border-red-200 bg-white p-6 shadow-2xl transition-all dark:border-red-900/40 dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Warning Header */}
            <div className="flex items-center gap-3 border-b border-zinc-200 pb-4 dark:border-zinc-800">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  Delete Brand & Products?
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  This action cannot be undone.
                </p>
              </div>
            </div>

            {/* Brand Info Preview */}
            <div className="my-4 flex items-center gap-3 rounded-md bg-zinc-50 p-3 dark:bg-zinc-800/50">
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
                {brand.logoUrl ? (
                  <Image
                    src={brand.logoUrl}
                    alt={brand.name}
                    fill
                    className="object-contain p-1"
                    sizes="48px"
                  />
                ) : (
                  <span className="text-xs font-semibold text-zinc-400">—</span>
                )}
              </div>
              <div>
                <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {brand.name}
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {productCount} product{productCount === 1 ? "" : "s"} attached
                </p>
              </div>
            </div>

            {/* Warning Message details */}
            <div className="mb-6 space-y-2 text-xs text-zinc-600 dark:text-zinc-300">
              <p className="font-medium text-red-600 dark:text-red-400">
                ⚠️ Warning: Deleting this brand will permanently remove:
              </p>
              <ul className="list-disc space-y-1 pl-5 text-zinc-600 dark:text-zinc-400">
                <li>
                  The brand row <strong className="text-zinc-800 dark:text-zinc-200">{brand.name}</strong> and its logo from Cloudinary.
                </li>
                <li>
                  All <strong className="text-zinc-800 dark:text-zinc-200">{productCount} product(s)</strong> belonging to {brand.name}.
                </li>
                <li>
                  All product photos & images stored on Cloudinary for these products.
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isDeleting}
                className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50 dark:bg-red-700 dark:hover:bg-red-600"
              >
                {isDeleting ? (
                  <>
                    <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Deleting Everything...
                  </>
                ) : (
                  `Delete Brand & All ${productCount} Product${productCount === 1 ? "" : "s"}`
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
