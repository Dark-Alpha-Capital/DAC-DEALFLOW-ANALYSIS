import React from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const ThemeCardSkeleton = () => (
  <Card className="w-full transition-all duration-300">
    <CardHeader className="pb-3">
      <Skeleton className="h-4 w-16" />
      <Skeleton className="mt-2 h-5 w-3/4" />
      <Skeleton className="mt-2 h-4 w-1/2" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-12 w-full" />
    </CardContent>
    <CardFooter className="flex gap-2 pt-3">
      <Skeleton className="h-9 flex-1 rounded-md" />
      <Skeleton className="h-9 w-16 rounded-md" />
      <Skeleton className="h-9 w-9 rounded-md" />
    </CardFooter>
  </Card>
);

export default function ThemeCardGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <ThemeCardSkeleton key={i} />
      ))}
    </div>
  );
}
