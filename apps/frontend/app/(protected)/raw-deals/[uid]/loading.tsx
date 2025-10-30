import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import PreviousPageButton from "@/components/PreviousPageButton";
import AIReasoningSkeleton from "@/components/skeletons/AIReasoningSkeleton";
import SimItemSkeleton from "@/components/skeletons/SimItemSkeleton";

const Loading = () => {
  return (
    <section className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <PreviousPageButton />
      </div>

      <div className="mb-8 text-center">
        <Badge variant="secondary" className="mb-4">
          Loading Deal...
        </Badge>
        <Skeleton className="mx-auto mb-4 h-12 w-3/4 max-w-xl" />
        <Skeleton className="mx-auto h-6 w-2/3 max-w-lg" />
      </div>

      <div className="mb-8 flex flex-wrap justify-center gap-4">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card className="overflow-hidden border-2 border-primary/10 shadow-lg">
          <CardHeader className="border-b bg-primary/5 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-bold text-primary">
                Deal Details
              </CardTitle>
              <Skeleton className="h-6 w-24" />
            </div>
          </CardHeader>
          <CardContent className="grid gap-6 p-6 sm:grid-cols-2">
            <div className="space-y-4">
              <h3 className="font-semibold text-muted-foreground">
                Basic Information
              </h3>
              {Array(6)
                .fill(0)
                .map((_, i) => (
                  <div key={`basic-${i}`} className="flex items-center gap-2">
                    <Skeleton className="h-5 w-5 rounded-full" />
                    <div className="w-full">
                      <Skeleton className="h-5 w-full" />
                    </div>
                  </div>
                ))}
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-muted-foreground">
                Financial Details
              </h3>
              {Array(5)
                .fill(0)
                .map((_, i) => (
                  <div
                    key={`financial-${i}`}
                    className="flex items-center gap-2"
                  >
                    <Skeleton className="h-5 w-5 rounded-full" />
                    <div className="w-full">
                      <Skeleton className="h-5 w-full" />
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:row-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>AI Reasoning</CardTitle>
            <Skeleton className="h-8 w-32" />
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] pr-4">
              <div className="flex flex-col gap-4">
                <AIReasoningSkeleton />
                <AIReasoningSkeleton />
                <AIReasoningSkeleton />
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>SIMs (Strategic Investment Memos)</CardTitle>
            <Skeleton className="h-8 w-8 rounded-full" />
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px] pr-4">
              <div className="flex flex-col gap-4">
                <SimItemSkeleton />
                <SimItemSkeleton />
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default Loading;
