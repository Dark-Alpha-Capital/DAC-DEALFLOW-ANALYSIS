import PreviousPageButton from "@/components/PreviousPageButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import React from "react";

const Loading = () => {
  return (
    <section className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 md:grid-cols-2">
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="mt-4 text-2xl font-bold">
                <Skeleton className="h-8 w-48" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="mb-4 h-4 w-full" />
              <Skeleton className="mb-4 h-4 w-full" />
              <Skeleton className="mb-4 h-4 w-3/4" />
              <Skeleton className="mt-4 h-5 w-2/3" />
            </CardContent>
          </Card>

          <div className="md:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>
                  <Skeleton className="h-7 w-40" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
                <Skeleton className="h-10 w-full" />
                <div className="mt-6 flex items-center justify-center">
                  <Skeleton className="h-8 w-32" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Loading;
