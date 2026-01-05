import { Skeleton } from "@/components/ui/skeleton";

export default function NewCompanyLoadingSkeleton() {
  return (
    <section className="big-container block-space-mini min-h-screen">
      <div className="mb-8">
        <Skeleton className="mb-6 h-8 w-16" />

        <div className="border-b border-border pb-6">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="mt-2 h-4 w-72" />
        </div>
      </div>

      <div className="max-w-3xl space-y-8">
        <section>
          <Skeleton className="mb-4 h-4 w-40" />
          <div className="grid gap-4 border border-border p-6 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
          </div>
        </section>

        <section>
          <Skeleton className="mb-4 h-4 w-40" />
          <div className="grid gap-4 border border-border p-6 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
          </div>
        </section>

        <section>
          <Skeleton className="mb-4 h-4 w-24" />
          <div className="space-y-4 border border-border p-6">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="grid gap-4 sm:grid-cols-3">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="space-y-2">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-9 w-full" />
                  </div>
                ))}
              </div>
            ))}
            <Skeleton className="h-8 w-32" />
          </div>
        </section>

        <section>
          <Skeleton className="mb-4 h-4 w-28" />
          <div className="border border-border p-6">
            <Skeleton className="h-24 w-full" />
          </div>
        </section>

        <div className="flex justify-end gap-3 pt-4">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
    </section>
  );
}
