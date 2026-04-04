import { Skeleton } from "@/components/ui/skeleton";

export default function ChatSessionPageSkeleton() {
  return (
    <div className="flex min-h-[60vh] flex-col gap-6">
      <div className="space-y-4">
        <Skeleton className="h-16 w-3/4" />
        <Skeleton className="h-16 w-1/2" />
      </div>
      <div className="mt-auto">
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  );
}
