import { Skeleton } from "@/components/ui/skeleton";

export default function CimScreeningSessionPending() {
  return (
    <section className="block-space-mini container max-w-6xl space-y-4">
      <Skeleton className="h-20 rounded-lg border" />
      <Skeleton className="h-60 rounded-lg border" />
      <Skeleton className="h-80 rounded-lg border" />
    </section>
  );
}
