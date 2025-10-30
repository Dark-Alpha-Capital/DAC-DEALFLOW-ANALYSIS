import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <section className="block-space big-container">
      <div>
        <Skeleton className="mb-4 h-8 w-48" />
      </div>
      <div className="container mx-auto py-10">
        <div className="rounded-md border">
          <div className="border-b">
            <div className="flex h-12 items-center px-4">
              <Skeleton className="mr-4 h-5 w-5" />
              <Skeleton className="mr-8 h-5 w-24" />
              <Skeleton className="mr-8 h-5 w-32" />
              <Skeleton className="mr-8 h-5 w-24" />
              <Skeleton className="h-5 w-24" />
            </div>
          </div>
          <div>
            {Array(10)
              .fill(0)
              .map((_, index) => (
                <div
                  key={index}
                  className="flex h-16 items-center border-b px-4"
                >
                  <Skeleton className="mr-4 h-4 w-4" />
                  <Skeleton className="mr-8 h-4 w-32" />
                  <Skeleton className="mr-8 h-4 w-48" />
                  <Skeleton className="mr-8 h-4 w-24" />
                  <Skeleton className="h-6 w-16" />
                </div>
              ))}
          </div>
          <div className="flex items-center justify-between p-4">
            <Skeleton className="h-8 w-32" />
            <div className="flex items-center space-x-2">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-8" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
