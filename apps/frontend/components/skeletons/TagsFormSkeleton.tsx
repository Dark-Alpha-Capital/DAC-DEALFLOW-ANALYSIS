import { Skeleton } from "@/components/ui/skeleton";

export default function TagFormSkeleton() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 p-6">
      {/* Header section */}
      <div className="space-y-3 text-center">
        <Skeleton className="mx-auto h-8 w-80" />
        <Skeleton className="mx-auto h-5 w-96" />
      </div>

      {/* Form section */}
      <div className="space-y-4 rounded-lg border p-6">
        {/* Form label */}
        <Skeleton className="h-5 w-20" />

        {/* Helper text */}
        <Skeleton className="h-4 w-80" />

        {/* Tags container */}
        <div className="flex min-h-[40px] flex-wrap items-center gap-2">
          {/* Existing tag skeletons */}
          <Skeleton className="h-8 w-16 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-12 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>

        {/* Input field */}
        <Skeleton className="h-10 w-full rounded-md" />

        {/* Counter and helper text */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-8" />
        </div>

        {/* Save button */}
        <Skeleton className="h-10 w-24 rounded-md" />
      </div>
    </div>
  );
}
