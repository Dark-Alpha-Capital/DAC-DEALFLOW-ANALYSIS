export default function ProjectTrackersPageSkeleton() {
  return (
    <section className="block-space-mini container">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="bg-muted/50 h-9 w-56 animate-pulse rounded" />
          <div className="bg-muted/40 h-4 w-80 max-w-full animate-pulse rounded" />
        </div>
        <div className="bg-muted/50 h-9 w-40 animate-pulse rounded" />
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="bg-muted/40 h-9 w-44 animate-pulse rounded" />
        <div className="bg-muted/40 h-9 w-32 animate-pulse rounded" />
        <div className="bg-muted/40 h-9 w-52 animate-pulse rounded" />
      </div>
      <div className="ring-border/60 overflow-hidden rounded-xl ring-1">
        <div className="bg-muted/40 h-11 border-b" />
        <div className="divide-y">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="flex h-12 items-center gap-4 px-4">
              <div className="bg-muted/50 h-4 w-40 animate-pulse rounded" />
              <div className="bg-muted/40 h-4 w-24 animate-pulse rounded" />
              <div className="bg-muted/40 h-4 w-28 animate-pulse rounded" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
