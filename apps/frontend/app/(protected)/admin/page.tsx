import getCurrentUserRole from "@/lib/data/current-user-role";
import { redirect } from "next/navigation";
import { DataTable } from "./data-table";
import { columns } from "./columns";
import { getUsersForAdminTable } from "db/queries";
import { unstable_cacheLife as cacheLife } from "next/cache";

export const metadata = {
  title: "Admin Dashboard",
  description: "Admin Dashboard",
};

async function getAdminData() {
  "use cache";
  cacheLife("minutes");

  const data = await getUsersForAdminTable();
  return data;
}

const AdminPage = async () => {
  const currentUserRole = await getCurrentUserRole();

  if (currentUserRole === "USER") {
    redirect("/");
  }

  const data = await getAdminData();

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
