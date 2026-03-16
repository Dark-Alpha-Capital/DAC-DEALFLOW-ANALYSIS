import { Skeleton } from "@/components/ui/skeleton";

export function ChatRedirectSkeleton() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
  );
}
