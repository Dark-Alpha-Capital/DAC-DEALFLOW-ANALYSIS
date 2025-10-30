import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AIReasoningSkeleton() {
  return (
    <Card className="mb-4">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          <Skeleton className="h-4 w-[150px]" />
        </CardTitle>
        <Skeleton className="h-5 w-16" />
      </CardHeader>
      <CardContent>
        <Skeleton className="mb-2 h-4 w-full" />
        <Skeleton className="mb-2 h-4 w-[90%]" />
        <Skeleton className="mb-2 h-4 w-[95%]" />
        <Skeleton className="h-4 w-[80%]" />
      </CardContent>
    </Card>
  );
}
