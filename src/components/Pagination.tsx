import Link from "next/link";

export const PAGE_SIZE = 24;

/**
 * Page links keep the current querystring, so a brand filter or sort survives
 * paging. Links are real <a> elements rather than buttons — crawlers follow
 * them, which is how deep catalog pages get indexed.
 */
export function Pagination({
  page,
  totalPages,
  basePath,
  params = {},
}: {
  page: number;
  totalPages: number;
  basePath: string;
  params?: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) return null;

  function hrefFor(target: number) {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value) search.set(key, value);
    }
    if (target > 1) search.set("page", String(target));
    const qs = search.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  // A compact window around the current page — a 40-page catalog shouldn't
  // render 40 links.
  const pages: number[] = [];
  const from = Math.max(1, page - 2);
  const to = Math.min(totalPages, page + 2);
  for (let i = from; i <= to; i += 1) pages.push(i);

  return (
    <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-1">
      {page > 1 && (
        <Link href={hrefFor(page - 1)} className="btn-secondary h-9 px-3 py-0 text-caption">
          Previous
        </Link>
      )}

      {from > 1 && (
        <>
          <Link href={hrefFor(1)} className="px-3 py-2 text-caption text-ink-muted hover:text-brand">
            1
          </Link>
          {from > 2 && <span className="px-1 text-caption text-ink-muted">…</span>}
        </>
      )}

      {pages.map((p) =>
        p === page ? (
          <span
            key={p}
            aria-current="page"
            className="price border border-brand bg-brand px-3 py-2 text-caption text-white"
          >
            {p}
          </span>
        ) : (
          <Link
            key={p}
            href={hrefFor(p)}
            className="price px-3 py-2 text-caption text-ink-muted hover:text-brand"
          >
            {p}
          </Link>
        ),
      )}

      {to < totalPages && (
        <>
          {to < totalPages - 1 && <span className="px-1 text-caption text-ink-muted">…</span>}
          <Link
            href={hrefFor(totalPages)}
            className="px-3 py-2 text-caption text-ink-muted hover:text-brand"
          >
            {totalPages}
          </Link>
        </>
      )}

      {page < totalPages && (
        <Link href={hrefFor(page + 1)} className="btn-secondary h-9 px-3 py-0 text-caption">
          Next
        </Link>
      )}
    </nav>
  );
}
