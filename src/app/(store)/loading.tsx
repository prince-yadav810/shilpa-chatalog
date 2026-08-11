export default function Loading() {
  return (
    <div className="w-full animate-pulse p-3 sm:p-5">
      {/* Header Banner Skeleton */}
      <div className="h-24 w-full rounded-2xl bg-border/40" />

      {/* Grid Title Skeleton */}
      <div className="mt-8 mb-4 h-6 w-48 rounded-lg bg-border/60" />

      {/* Product Cards Skeleton Grid */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-surface p-3"
          >
            <div className="aspect-square w-full rounded-xl bg-border/40" />
            <div className="mt-3 h-3 w-16 rounded bg-border/60" />
            <div className="mt-1.5 h-4 w-full rounded bg-border/60" />
            <div className="mt-1.5 h-4 w-2/3 rounded bg-border/40" />
            <div className="mt-3 flex items-center justify-between">
              <div className="h-5 w-14 rounded bg-border/60" />
              <div className="h-8 w-16 rounded-lg bg-border/40" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
