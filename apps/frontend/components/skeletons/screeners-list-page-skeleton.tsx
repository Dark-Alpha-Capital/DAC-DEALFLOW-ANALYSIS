export default function ScreenersListPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="bg-muted/40 h-24 animate-pulse rounded-lg border"
          />
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border">
        <div className="bg-muted/40 hidden h-12 border-b lg:block" />
        <div className="divide-y">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="space-y-3 px-5 py-5 lg:px-6">
              <div className="bg-muted/50 h-5 w-48 animate-pulse rounded" />
              <div className="bg-muted/40 h-4 w-full max-w-2xl animate-pulse rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
