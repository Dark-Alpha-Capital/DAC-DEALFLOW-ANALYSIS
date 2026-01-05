import { Skeleton } from "@/components/ui/skeleton";

export default function CompaniesLoadingSkeleton() {
  return (
    <section className="big-container block-space-mini min-h-screen">
      <header className="mb-8 flex items-end justify-between border-b border-border pb-6">
        <div>
          <Skeleton className="h-7 w-32" />
          <Skeleton className="mt-2 h-4 w-48" />
        </div>
        <Skeleton className="h-8 w-28" />
      </header>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="flex flex-col border border-border bg-card p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="mt-1 h-3 w-1/2" />
                </div>
                <Skeleton className="h-6 w-6" />
              </div>

              <div className="mt-4 space-y-2">
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4">
                <div>
                  <Skeleton className="h-2 w-12" />
                  <Skeleton className="mt-1 h-4 w-16" />
                </div>
                <div>
                  <Skeleton className="h-2 w-12" />
                  <Skeleton className="mt-1 h-4 w-16" />
                </div>
              </div>

              <div className="mt-4 flex gap-4 border-t border-border pt-4">
                <Skeleton className="h-2 w-12" />
                <Skeleton className="h-2 w-16" />
                <Skeleton className="h-2 w-14" />
                <Skeleton className="h-2 w-10" />
              </div>

              <div className="mt-4 flex gap-2">
                <Skeleton className="h-8 flex-1" />
                <Skeleton className="h-8 flex-1" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
