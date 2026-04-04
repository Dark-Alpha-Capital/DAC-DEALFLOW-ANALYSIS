import { createFileRoute, redirect } from "@tanstack/react-router";
import { fetchCurrentUserRole } from "@/lib/server/fetch-session-server-fn";
import { DataTable } from "@/components/admin/data-table";
import { columns } from "@/components/admin/columns";
import AdminPageSkeleton from "@/components/skeletons/admin-page-skeleton";
import { loadAdminUsersData } from "@/lib/server/admin-route-data";

export const Route = createFileRoute("/_protected/admin")({
  head: () => ({
    meta: [{ title: "Admin Dashboard — Dark Alpha Capital" }],
  }),
  beforeLoad: async () => {
    const currentUserRole = await fetchCurrentUserRole();
    if (currentUserRole === "USER") {
      throw redirect({ to: "/" });
    }
  },
  loader: async () => loadAdminUsersData(),
  pendingComponent: AdminPageSkeleton,
  component: AdminRoute,
});

function AdminRoute() {
  const { data } = Route.useLoaderData();
  return (
    <section className="block-space big-container">
      <div>
        <h2>Admin Dashboard</h2>
      </div>
      <div className="container mx-auto py-10">
        <DataTable columns={columns} data={data} />
      </div>
    </section>
  );
}
