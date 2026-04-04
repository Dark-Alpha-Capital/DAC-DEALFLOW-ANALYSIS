import { Skeleton } from "@/components/ui/skeleton";

export default function ThemeDetailPageSkeleton() {
  return (
    <section className="container mx-auto max-w-5xl px-4 py-8">
      <Skeleton className="mb-6 h-9 w-32" />
      <div className="space-y-6">
        <div className="flex gap-2">
          <Skeleton className="h-6 w-20" />
        </div>
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-5 w-1/2" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-20 w-full" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
    </section>
  );
}
