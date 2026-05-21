// Root-level loading — shown for any page without its own loading.tsx
export default function RootLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="relative h-10 w-10">
          <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
          <div className="relative h-10 w-10 animate-spin rounded-full border-2 border-transparent border-t-primary" />
        </div>
        <p className="text-sm text-muted-foreground">載入中…</p>
      </div>
    </div>
  );
}
