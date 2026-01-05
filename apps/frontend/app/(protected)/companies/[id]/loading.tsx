import { Skeleton } from "@/components/ui/skeleton";

export default function CompanyDetailLoadingSkeleton() {
  return (
    <section className="big-container block-space-mini min-h-screen">
      <div className="mb-8">
        <Skeleton className="mb-6 h-8 w-16" />

        <div className="flex items-start justify-between border-b border-border pb-6">
          <div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-5 w-16" />
            </div>
            <Skeleton className="mt-2 h-4 w-32" />
            <Skeleton className="mt-3 h-4 w-96" />
          </div>

          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-14" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <section>
            <Skeleton className="mb-4 h-4 w-40" />
            <div className="grid gap-6 border border-border p-6 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i}>
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="mt-2 h-4 w-32" />
                </div>
              ))}
            </div>
          </section>

          <section>
            <Skeleton className="mb-4 h-4 w-40" />
            <div className="grid gap-6 border border-border p-6 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i}>
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="mt-2 h-6 w-20" />
                </div>
              ))}
            </div>
          </section>

          <section>
            <Skeleton className="mb-4 h-4 w-32" />
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between border border-border p-4"
                >
                  <div>
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="mt-1 h-3 w-24" />
                    <Skeleton className="mt-2 h-3 w-40" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-8">
          <section>
            <Skeleton className="mb-4 h-4 w-40" />
            <div className="space-y-3 border border-border p-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-3.5 w-3.5" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <Skeleton className="h-4 w-6" />
                </div>
              ))}
            </div>
          </section>

          <section>
            <Skeleton className="mb-4 h-4 w-32" />
            <div className="border border-border p-5">
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Skeleton className="h-3 w-3" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
