import { Suspense } from "react";
import { ChevronUp } from "lucide-react";
import { Metadata } from "next";
import { getAllRollups } from "@/lib/queries";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import RollupCard from "@/components/RollupCard";

export const metadata: Metadata = {
  title: "Rollups",
  description: "View all rollups",
};

export default async function RollupsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/login");
  }

  const rollups = await getAllRollups();

  if (!rollups || rollups.length === 0) {
    return (
      <div className="p-6">
        <h1 className="mb-6 flex items-center gap-2 text-2xl font-bold">
          <ChevronUp className="h-5 w-5" />
          All Rollups
        </h1>
        <div className="text-muted-foreground">No rollups found.</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="mb-6 flex items-center gap-2 text-2xl font-bold">
        <ChevronUp className="h-5 w-5" />
        All Rollups
      </h1>

      <div className="flex flex-col gap-4">
        {rollups.map((rollup) => (
          <Suspense key={rollup.id} fallback={<div>Loading...</div>}>
            <RollupCard rollup={rollup} currentUserRole={session.user.role} />
          </Suspense>
        ))}
      </div>
    </div>
  );
}
