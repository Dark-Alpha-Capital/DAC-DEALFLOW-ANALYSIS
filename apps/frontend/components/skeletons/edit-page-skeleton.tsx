import { Skeleton } from "../ui/skeleton";

export default function EditPageSkeleton() {
  return (
    <section className="big-container block-space min-h-screen">
      <Skeleton className="mb-6 h-9 w-32" />
      <Skeleton className="mb-4 h-8 w-48" />
      <Skeleton className="h-4 w-64" />
      <div className="mt-8 flex gap-2">
        <Skeleton className="h-9 w-28 rounded-md" />
        <Skeleton className="h-9 w-36 rounded-md" />
      </div>
      <div className="mt-8 space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </section>
  );
}
