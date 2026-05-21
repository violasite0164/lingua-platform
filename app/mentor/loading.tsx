function Shimmer({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-zinc-800 ${className ?? ''}`} />;
}

export default function MentorLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-8 p-4 md:p-8">

      {/* Header row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Shimmer className="h-8 w-48" />
          <Shimmer className="h-4 w-72" />
        </div>
        <Shimmer className="h-9 w-28 rounded-md" />
      </div>

      {/* Stats tiles */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5 space-y-4"
          >
            <div className="flex justify-between items-center">
              <Shimmer className="h-4 w-24" />
              <Shimmer className="h-4 w-4 rounded" />
            </div>
            <Shimmer className="h-9 w-16" />
            <Shimmer className="h-3 w-32" />
          </div>
        ))}
      </div>

      {/* Quick-start card */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-3">
        <Shimmer className="h-5 w-24" />
        <div className="flex flex-wrap gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Shimmer key={i} className="h-4 w-40" />
          ))}
        </div>
      </div>
    </div>
  );
}
