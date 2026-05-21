// Streaming skeleton — shown instantly while server fetches dashboard data.
// Matches the layout of DashboardPage so there's no layout shift on load.

function Shimmer({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-muted ${className ?? ''}`} />
  );
}

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">

        {/* Top bar */}
        <div className="flex items-center justify-between">
          <Shimmer className="h-4 w-32" />
          <Shimmer className="h-8 w-8 rounded-full" />
        </div>

        {/* Hero card */}
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="bg-primary/10 p-6 space-y-4">
            <div className="flex items-center gap-4">
              <Shimmer className="h-16 w-16 rounded-full" />
              <div className="space-y-2">
                <Shimmer className="h-3 w-20" />
                <Shimmer className="h-7 w-40" />
                <Shimmer className="h-5 w-16 rounded-full" />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <Shimmer className="h-3 w-28" />
                <Shimmer className="h-3 w-28" />
              </div>
              <Shimmer className="h-2.5 w-full rounded-full" />
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
              <Shimmer className="h-9 w-9 rounded-lg" />
              <Shimmer className="h-8 w-16" />
              <Shimmer className="h-3 w-24" />
            </div>
          ))}
        </div>

        {/* Main content */}
        <div className="grid gap-6 lg:grid-cols-5">

          {/* Left — course cards */}
          <div className="space-y-4 lg:col-span-3">
            <div className="flex items-center justify-between">
              <Shimmer className="h-6 w-24" />
              <Shimmer className="h-4 w-28" />
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl border bg-card p-4 shadow-sm">
                <div className="flex gap-4">
                  <Shimmer className="h-16 w-24 shrink-0 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Shimmer className="h-4 w-full" />
                    <Shimmer className="h-3 w-1/3" />
                    <Shimmer className="h-1.5 w-full rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Right — assignments + quick actions */}
          <div className="space-y-4 lg:col-span-2">
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
              <div className="p-4 border-b">
                <Shimmer className="h-5 w-20" />
              </div>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3 px-4 py-3 border-b last:border-0">
                  <Shimmer className="h-7 w-7 rounded-md shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Shimmer className="h-3 w-full" />
                    <Shimmer className="h-3 w-2/3" />
                    <Shimmer className="h-4 w-14 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
            <div className="rounded-xl border bg-card shadow-sm p-4 space-y-3">
              <Shimmer className="h-5 w-20" />
              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Shimmer key={i} className="h-9 rounded-md" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
