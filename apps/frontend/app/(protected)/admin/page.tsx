import getCurrentUserRole from "@/lib/data/current-user-role";
import { redirect } from "next/navigation";
import { DataTable } from "./data-table";
import { columns } from "./columns";
import { getUsersForAdminTable } from "db/queries";

export const metadata = {
  title: "Admin Dashboard",
  description: "Admin Dashboard",
};

const AdminPage = async () => {
  const currentUserRole = await getCurrentUserRole();

  if (currentUserRole === "USER") {
    redirect("/");
  }

  const data = await getUsersForAdminTable();

  return (
    <>
      <section className="block-space big-container">
        <div>
          <h2>Admin Dashboard</h2>
        </div>
        <div className="container mx-auto py-10">
          <DataTable columns={columns} data={data} />
        </div>
      </section>
    </>
  );
};

export default AdminPage;
