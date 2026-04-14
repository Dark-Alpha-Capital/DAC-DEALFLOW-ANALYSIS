import { z } from "zod";
import { createTRPCRouter, adminProcedure } from "../init";
import { UserRole } from "@repo/db/enums";
import {
  listAllUsersForAdmin,
  getUserRoleById,
  setUserBlocked,
} from "@repo/db/mutations";
import { after } from "@/lib/after";
import { revalidatePath } from "@/lib/cache-invalidation";
import { TRPCError } from "@trpc/server";

export const usersRouter = createTRPCRouter({
  getAll: adminProcedure.query(async () => {
    return listAllUsersForAdmin();
  }),

  block: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input }) => {
      const targetUser = await getUserRoleById(input.userId);

      if (!targetUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      if (targetUser.role === UserRole.ADMIN) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot block admin users",
        });
      }

      await setUserBlocked(input.userId, true);

      after(async () => {
        revalidatePath("/admin");
      });
      return { success: true };
    }),

  unblock: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input }) => {
      await setUserBlocked(input.userId, false);

      after(async () => {
        revalidatePath("/admin");
      });
      return { success: true };
    }),
});
