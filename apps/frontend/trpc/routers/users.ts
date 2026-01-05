import { z } from "zod";
import { createTRPCRouter, adminProcedure } from "../init";
import { db } from "db";
import { users, UserRole } from "db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { TRPCError } from "@trpc/server";

export const usersRouter = createTRPCRouter({
  getAll: adminProcedure.query(async () => {
    const allUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        isBlocked: users.isBlocked,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(users.createdAt);

    return allUsers;
  }),

  block: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input }) => {
      const [targetUser] = await db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.id, input.userId));

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

      await db
        .update(users)
        .set({ isBlocked: true })
        .where(eq(users.id, input.userId));

      revalidatePath("/admin");

      return { success: true };
    }),

  unblock: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input }) => {
      await db
        .update(users)
        .set({ isBlocked: false })
        .where(eq(users.id, input.userId));

      revalidatePath("/admin");

      return { success: true };
    }),
});
