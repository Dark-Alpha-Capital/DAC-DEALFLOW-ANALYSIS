import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../init";
import { getWorkLogsByWorkItemId, getTotalHoursByWorkItemId } from "@repo/db-tracker/queries";
import {
  createWorkLog,
  updateWorkLog,
  deleteWorkLog,
} from "@repo/db-tracker/mutations";
import { createWorkLogSchema, updateWorkLogSchema } from "@repo/schemas";

export const workLogsRouter = createTRPCRouter({
  listByWorkItem: protectedProcedure
    .input(z.object({ workItemId: z.string().min(1) }))
    .query(async ({ input }) => {
      return getWorkLogsByWorkItemId(input.workItemId);
    }),

  totalByWorkItem: protectedProcedure
    .input(z.object({ workItemId: z.string().min(1) }))
    .query(async ({ input }) => {
      return getTotalHoursByWorkItemId(input.workItemId);
    }),

  create: protectedProcedure
    .input(createWorkLogSchema)
    .mutation(async ({ ctx, input }) => {
      return createWorkLog({ ...input, userId: ctx.user.id });
    }),

  update: protectedProcedure
    .input(updateWorkLogSchema)
    .mutation(async ({ input }) => {
      const { logId, ...fields } = input;
      const updated = await updateWorkLog({ logId, ...fields });
      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Work log not found" });
      }
      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ logId: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const deleted = await deleteWorkLog(input.logId);
      if (!deleted) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Work log not found" });
      }
      return { success: true };
    }),
});
