export default function ProductLoading() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse p-4 sm:p-6">
      <div className="mb-4 h-4 w-48 rounded bg-border/40" />

      <div className="grid gap-6 md:grid-cols-2 md:gap-10">
        {/* Product Image Skeleton */}
        <div className="aspect-square w-full rounded-2xl border border-border/60 bg-surface p-4">
          <div className="h-full w-full rounded-xl bg-border/40" />
        </div>

        {/* Product Info Skeleton */}
        <div className="flex flex-col justify-between">
          <div>
            <div className="h-3 w-20 rounded bg-border/60" />
            <div className="mt-2 h-7 w-3/4 rounded-lg bg-border/60" />
            <div className="mt-3 h-5 w-24 rounded bg-border/40" />
            <div className="mt-4 h-8 w-32 rounded-lg bg-border/60" />
          </div>

          <div className="mt-8 flex gap-3">
            <div className="h-12 flex-1 rounded-xl bg-border/60" />
            <div className="h-12 w-12 rounded-xl bg-border/40" />
          </div>
        </div>
      </div>
    </div>
  );
}
