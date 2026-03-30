import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import PreviousPageButton from "@/components/PreviousPageButton";

const loading = () => {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <PreviousPageButton />
          <Skeleton className="h-10 w-40" />
        </div>

        <div className="space-y-6">
          {/* Main Card Header */}
          <Card>
            <CardHeader className="space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-9 w-3/4" />
                <Skeleton className="h-5 w-1/2" />
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-28" />
              </div>
            </CardHeader>
          </Card>

          {/* Score and Sentiment Cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <Skeleton className="h-6 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-9 w-16" />
                <Skeleton className="mt-2 h-4 w-32" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <Skeleton className="h-6 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24" />
                <Skeleton className="mt-2 h-4 w-36" />
              </CardContent>
            </Card>
          </div>

          {/* Explanation Card */}
          <Card>
            <CardHeader>
              <Skeleton className="h-7 w-48" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-1 w-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
              </div>
            </CardContent>
          </Card>

          {/* Content Card */}
          <Card>
            <CardHeader>
              <Skeleton className="h-7 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default loading;
