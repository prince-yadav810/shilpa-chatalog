export default function CategoryLoading() {
  return (
    <div className="flex min-h-[calc(100vh-8.5rem)] w-full">
      {/* Left Sidebar Skeleton */}
      <aside className="sticky top-[135px] sm:top-[125px] z-20 flex h-[calc(100vh-8.5rem)] w-20 shrink-0 flex-col border-r border-border/80 bg-surface/95 p-2 sm:w-24 md:w-56">
        <div className="hidden border-b border-border/60 pb-3 md:block">
          <div className="h-4 w-32 rounded bg-border/60" />
          <div className="mt-1 h-3 w-16 rounded bg-border/40" />
        </div>
        <div className="flex flex-col gap-3 py-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 p-1">
              <div className="h-11 w-11 rounded-full bg-border/50 sm:h-13 sm:w-13" />
              <div className="h-2.5 w-12 rounded bg-border/40" />
            </div>
          ))}
        </div>
      </aside>

      {/* Main Content Area Skeleton */}
      <main className="flex-1 p-3 sm:p-5 min-w-0 animate-pulse">
        {/* Breadcrumb skeleton */}
        <div className="mb-3 h-4 w-40 rounded bg-border/40" />

        {/* Title skeleton */}
        <div className="mb-4">
          <div className="h-6 w-56 rounded-lg bg-border/60" />
          <div className="mt-1 h-3 w-24 rounded bg-border/40" />
        </div>

        {/* Brand pills skeleton */}
        <div className="mb-4 flex gap-2 overflow-x-auto py-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-7 w-20 shrink-0 rounded-full bg-border/40" />
          ))}
        </div>

        {/* Product Grid Skeleton */}
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
      </main>
    </div>
  );
}
