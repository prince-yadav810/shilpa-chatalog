"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ImageIcon, Loader2, Plus, Search, Trash2, X } from "lucide-react";
import { useToast } from "@/components/admin/Toast";
import type { HomepageSectionKey } from "@/lib/homepage";

export type HomepageControlItem = {
  id: string;
  targetId: string;
  title: string;
  detail: string;
  imageUrl: string | null;
};

type Candidate = HomepageControlItem;

/**
 * The same compact manager drives all four homepage shelves. It keeps the
 * most important action (ordering selected cards) on screen and opens search
 * only when the admin wants to add something new.
 */
export function HomepageSectionManager({
  section,
  title,
  hint,
  items,
}: {
  section: HomepageSectionKey;
  title: string;
  hint: string;
  items: HomepageControlItem[];
}) {
  const [currentItems, setCurrentItems] = useState(items);
  const [finderOpen, setFinderOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [searching, setSearching] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const router = useRouter();
  const { show } = useToast();

  useEffect(() => setCurrentItems(items), [items]);

  useEffect(() => {
    if (!finderOpen) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const params = new URLSearchParams({ section, q: query });
        const response = await fetch(`/api/homepage?${params}`, { signal: controller.signal });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error ?? "Couldn't load items");
        setCandidates(body.candidates ?? []);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          show(error instanceof Error ? error.message : "Couldn't load items", "error");
        }
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, query ? 220 : 0);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [finderOpen, query, section, show]);

  async function add(candidate: Candidate) {
    setBusyId(candidate.id);
    try {
      const response = await fetch("/api/homepage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, targetId: candidate.id }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        show(body.error ?? "Couldn't add this item", "error");
        return;
      }
      show(`Added to ${title}`);
      setQuery("");
      setFinderOpen(false);
      router.refresh();
    } catch {
      show("Network problem — try again.", "error");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(item: HomepageControlItem) {
    const before = currentItems;
    setBusyId(item.id);
    setCurrentItems((rows) => rows.filter((row) => row.id !== item.id));
    try {
      const response = await fetch("/api/homepage", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Couldn't remove this item");
      show("Removed from the homepage");
      router.refresh();
    } catch (error) {
      setCurrentItems(before);
      show(error instanceof Error ? error.message : "Network problem — try again.", "error");
    } finally {
      setBusyId(null);
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= currentItems.length || savingOrder) return;

    const before = currentItems;
    const next = [...currentItems];
    [next[index], next[target]] = [next[target], next[index]];
    setCurrentItems(next);
    setSavingOrder(true);

    try {
      const response = await fetch("/api/homepage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, itemIds: next.map((item) => item.id) }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Couldn't save the new order");
      router.refresh();
    } catch (error) {
      setCurrentItems(before);
      show(error instanceof Error ? error.message : "Network problem — try again.", "error");
    } finally {
      setSavingOrder(false);
    }
  }

  const selectedTargetIds = new Set(currentItems.map((item) => item.targetId));

  return (
    <section className="overflow-hidden rounded-2xl border border-[#eadcd3] bg-white shadow-[0_8px_24px_rgba(82,49,30,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#f0e5df] bg-[#fffaf7] px-4 py-4 sm:px-5">
        <div>
          <h2 className="font-heading text-lg font-semibold text-ink">{title}</h2>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-ink-muted">{hint}</p>
        </div>
        <button
          type="button"
          onClick={() => setFinderOpen((open) => !open)}
          disabled={currentItems.length >= 12}
          className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {finderOpen ? <X size={15} /> : <Plus size={15} strokeWidth={2.8} />}
          {finderOpen ? "Close picker" : "Add item"}
        </button>
      </div>

      {finderOpen && (
        <div className="border-b border-[#f0e5df] bg-[#fffdfb] p-4 sm:p-5">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" size={16} />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search the catalog…"
              className="field w-full rounded-xl py-2.5 pl-9 text-sm"
            />
          </label>
          <div className="mt-3 max-h-64 divide-y divide-[#f2e8e2] overflow-y-auto rounded-xl border border-[#eee2da] bg-white">
            {searching ? (
              <div className="flex items-center justify-center gap-2 px-4 py-7 text-xs text-ink-muted">
                <Loader2 size={16} className="animate-spin" /> Finding items…
              </div>
            ) : candidates.length === 0 ? (
              <p className="px-4 py-7 text-center text-xs text-ink-muted">No eligible items found. Try another search.</p>
            ) : (
              candidates.map((candidate) => {
                const alreadySelected = selectedTargetIds.has(candidate.id);
                return (
                  <div key={candidate.id} className="flex items-center gap-3 px-3 py-2.5">
                    <Thumbnail imageUrl={candidate.imageUrl} title={candidate.title} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{candidate.title}</p>
                      <p className="truncate text-xs text-ink-muted">{candidate.detail}</p>
                    </div>
                    <button
                      type="button"
                      disabled={alreadySelected || busyId === candidate.id}
                      onClick={() => add(candidate)}
                      className="shrink-0 rounded-lg border border-brand/25 px-2.5 py-1.5 text-xs font-bold text-brand transition hover:bg-brand hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {busyId === candidate.id ? "Adding…" : alreadySelected ? "Added" : "Add"}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {currentItems.length === 0 ? (
        <p className="px-5 py-7 text-sm text-ink-muted">
          No manual choices yet. The shop will use its automatic selection until you add an item here.
        </p>
      ) : (
        <ol className="divide-y divide-[#f0e5df]">
          {currentItems.map((item, index) => (
            <li key={item.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#fff0e7] text-[11px] font-black text-[#c7462d]">
                {index + 1}
              </span>
              <Thumbnail imageUrl={item.imageUrl} title={item.title} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{item.title}</p>
                <p className="truncate text-xs text-ink-muted">{item.detail}</p>
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0 || savingOrder}
                  aria-label={`Move ${item.title} earlier`}
                  className="rounded-lg p-2 text-ink-muted transition hover:bg-[#fff0e7] hover:text-brand disabled:opacity-25"
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === currentItems.length - 1 || savingOrder}
                  aria-label={`Move ${item.title} later`}
                  className="rounded-lg p-2 text-ink-muted transition hover:bg-[#fff0e7] hover:text-brand disabled:opacity-25"
                >
                  <ArrowDown size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => remove(item)}
                  disabled={busyId === item.id || savingOrder}
                  aria-label={`Remove ${item.title}`}
                  className="rounded-lg p-2 text-ink-muted transition hover:bg-red-50 hover:text-red-600 disabled:opacity-25"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}

      {currentItems.length > 0 && (
        <p className="border-t border-[#f0e5df] bg-[#fffdfb] px-5 py-2.5 text-[11px] text-ink-muted">
          {currentItems.length}/12 selected · use the arrows to set the exact storefront sequence.
        </p>
      )}
    </section>
  );
}

function Thumbnail({ imageUrl, title }: { imageUrl: string | null; title: string }) {
  return (
    <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#eee2da] bg-[#fffaf7]">
      {imageUrl ? (
        <Image src={imageUrl} alt="" fill unoptimized sizes="40px" className="object-contain p-1" />
      ) : (
        <ImageIcon size={16} className="text-[#d8bdb0]" aria-label={`${title} has no image`} />
      )}
    </div>
  );
}
