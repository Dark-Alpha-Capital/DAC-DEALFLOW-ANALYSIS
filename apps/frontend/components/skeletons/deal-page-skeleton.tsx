import { Skeleton } from "../ui/skeleton";

export default function DealPageSkeleton() {
  return (
    <section className="container mx-auto max-w-5xl px-4 py-8">
      {/* Back button skeleton */}
      <Skeleton className="mb-6 h-9 w-40" />

      {/* Header skeleton */}
      <div className="space-y-6">
        <div className="flex gap-2">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-20" />
        </div>
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-6 w-1/2" />

        {/* Status indicators skeleton */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>

        {/* Action buttons skeleton */}
        <div className="flex gap-3">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-36" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-10" />
        </div>
      </div>

      {/* Tabs skeleton */}
      <div className="mt-8">
        <Skeleton className="mb-6 h-10 w-full max-w-md" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    </section>
  );
}
