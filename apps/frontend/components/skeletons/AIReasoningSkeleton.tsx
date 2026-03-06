import { Skeleton } from "@/components/ui/skeleton";

export default function AIReasoningSkeleton() {
  return (
    <div className="mb-4 rounded-xl border bg-background p-6 shadow">
      <div className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-[150px]" />
        <Skeleton className="h-5 w-16" />
      </div>
      <div className="pt-0">
        <Skeleton className="mb-2 h-4 w-full" />
        <Skeleton className="mb-2 h-4 w-[90%]" />
        <Skeleton className="mb-2 h-4 w-[95%]" />
        <Skeleton className="h-4 w-[80%]" />
      </div>
    </div>
  );
}
