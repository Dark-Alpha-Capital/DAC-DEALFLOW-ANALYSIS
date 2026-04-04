import { Skeleton } from "@/components/ui/skeleton";

export default function InvestorLeadDetailPageSkeleton() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <Skeleton className="mb-8 h-5 w-28" />
      <div className="space-y-6">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-5 w-20" />
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </section>
  );
}
