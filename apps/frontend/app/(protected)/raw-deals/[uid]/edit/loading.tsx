import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import PreviousPageButton from "@/components/PreviousPageButton";
import React from "react";

const Loading = () => {
  return (
    <section className="block-space relative">
      <div className="absolute left-8 top-6">
        <PreviousPageButton />
      </div>
      <div className="narrow-container mb-8 md:mb-10 lg:mb-12">
        <Skeleton className="mx-auto mb-4 h-12 w-3/4 max-w-xl" />
        <Skeleton className="mx-auto h-24 w-full max-w-2xl rounded-md" />
      </div>
      <div className="big-container">
        <Card className="transition-all duration-75 ease-in-out hover:shadow-lg">
          <CardContent className="p-6">
            <div className="space-y-6">
              {/* Form field skeletons */}
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-10 w-full" />
              </div>

              <div className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-10 w-full" />
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-5 w-36" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>

              <div className="space-y-2">
                <Skeleton className="h-5 w-44" />
                <Skeleton className="h-32 w-full" />
              </div>

              <div className="flex justify-end space-x-4">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-32" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default Loading;
