import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getRollupById } from "@/lib/queries";
import PreviousPageButton from "@/components/PreviousPageButton";
import EditRollupDialog from "@/components/Dialogs/edit-rollup-dialog";
import RollupDealsList from "@/components/RollupDealsList";

type Params = Promise<{ id: string }>;

export async function generateMetadata(props: {
  params: Params;
}): Promise<Metadata> {
  const { id } = await props.params;

  const rollup = await getRollupById(id);

  return {
    title: rollup?.name || "Rollup Details",
    description: rollup?.description || "View rollup details",
  };
}

export default async function RollupDetailsPage(props: { params: Params }) {
  const { id } = await props.params;
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/login");
  }

  const rollup = await getRollupById(id);

  if (!rollup) {
    notFound();
  }

  return (
    <div className="space-y-6 p-6">
      <PreviousPageButton />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{rollup.name}</h1>
        <EditRollupDialog rollup={rollup} />
      </div>

      {rollup.description && (
        <p className="text-muted-foreground">{rollup.description}</p>
      )}

      {rollup.summary && (
        <div className="rounded-md bg-gray-50 p-3">
          <h2 className="font-semibold">AI Summary</h2>
          <p className="text-sm text-muted-foreground">{rollup.summary}</p>
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        Created: {new Date(rollup.createdAt).toLocaleString()} | Updated:{" "}
        {new Date(rollup.updatedAt).toLocaleString()}
      </p>

      {/* Deals Section */}
      <div>
        <h2 className="mb-2 text-xl font-semibold">Deals</h2>
        <RollupDealsList
          deals={rollup.deals}
          rollupId={rollup.id}
          currentUserRole={session.user.role}
        />
      </div>

      {/* Users Section */}
      <div>
        <h2 className="mb-2 text-xl font-semibold">Saved by Users</h2>
        <ul className="space-y-1 text-sm text-muted-foreground">
          {rollup.users.map((user) => (
            <li key={user.id}>
              {user.name || user.email} {user.role ? `(${user.role})` : ""}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
