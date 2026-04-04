import { createServerFn } from "@tanstack/react-start";
import { getUsersForAdminTable } from "@repo/db/queries";
import { assertAdmin } from "@/lib/server/assert-session";

export const loadAdminUsersData = createServerFn({ method: "GET" }).handler(
  async () => {
    await assertAdmin();
    const data = await getUsersForAdminTable();
    return { data };
  },
);
