import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../init";
import { getProjectTrackerById, getEpicsByTrackerId } from "@repo/db-tracker/queries";
import {
  createEpic,
  updateEpic,
  deleteEpic,
} from "@repo/db-tracker/mutations";
import { createEpicSchema, updateEpicSchema } from "@repo/schemas";

export const epicsRouter = createTRPCRouter({
  listByTracker: protectedProcedure
    .input(z.object({ trackerId: z.string().min(1) }))
    .query(async ({ input }) => {
      const tracker = await getProjectTrackerById(input.trackerId);
      if (!tracker) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Tracker not found" });
      }
      return getEpicsByTrackerId(input.trackerId);
    }),

  create: protectedProcedure
    .input(createEpicSchema)
    .mutation(async ({ ctx, input }) => {
      const tracker = await getProjectTrackerById(input.trackerId);
      if (!tracker) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Tracker not found" });
      }
      return createEpic({
        ...input,
        createdBy: ctx.user.id,
      });
    }),

  update: protectedProcedure
    .input(updateEpicSchema)
    .mutation(async ({ input }) => {
      const { epicId, ...fields } = input;
      const updated = await updateEpic({ epicId, ...fields });
      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Epic not found" });
      }
      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ epicId: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const deleted = await deleteEpic(input.epicId);
      if (!deleted) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Epic not found" });
      }
      return { success: true };
    }),
});
