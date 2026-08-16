export default function AdminLoading() {
  return (
    <div className="w-full animate-pulse space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 rounded-lg bg-border/40" />
        <div className="h-9 w-24 rounded-lg bg-border/40" />
      </div>

      <div className="rounded-xl border border-border/40 bg-surface">
        <div className="border-b border-border/40 px-6 py-4">
          <div className="h-6 w-32 rounded bg-border/40" />
        </div>
        <div className="p-6 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <div className="h-12 w-12 rounded-lg bg-border/40" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 rounded bg-border/40" />
                <div className="h-3 w-1/4 rounded bg-border/40" />
              </div>
              <div className="h-8 w-16 rounded-md bg-border/40" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
