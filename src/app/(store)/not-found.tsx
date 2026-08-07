import Link from "next/link";

export default function NotFound() {
  return (
    <div className="border border-border bg-surface px-6 py-20 text-center">
      <h1 className="font-heading text-section text-ink">
        That page isn&rsquo;t here.
      </h1>
      <p className="mx-auto mt-2 max-w-md text-body text-ink-muted">
        The product or category may have been removed, or the link may be
        mistyped.
      </p>
      <div className="mt-5 flex justify-center gap-2">
        <Link href="/" className="btn-primary">
          Back to the shop
        </Link>
        <Link href="/brands" className="btn-secondary">
          Browse brands
        </Link>
      </div>
    </div>
  );
}
