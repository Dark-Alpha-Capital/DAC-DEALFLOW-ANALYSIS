import { createServerFn } from "@tanstack/react-start";
import { getUsersForAdminTable } from "@repo/db/queries";

export const loadAdminUsersData = createServerFn({ method: "GET" }).handler(
  async () => {
    const data = await getUsersForAdminTable();
    return { data };
  },
);
