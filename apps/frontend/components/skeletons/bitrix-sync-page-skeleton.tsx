import { Skeleton } from "@/components/ui/skeleton";

export default function BitrixSyncPageSkeleton() {
  return (
    <section className="container mx-auto max-w-5xl px-4 py-8">
      <Skeleton className="mb-4 h-8 w-64" />
      <Skeleton className="h-[420px] w-full max-w-2xl" />
    </section>
  );
}
