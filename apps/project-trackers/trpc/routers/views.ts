import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../init";
import { getProjectTrackerById, getViewsByTrackerId } from "@repo/db-tracker/queries";
import {
  createView,
  updateView,
  deleteView,
} from "@repo/db-tracker/mutations";
import { createViewSchema, updateViewSchema } from "@repo/schemas";

export const viewsRouter = createTRPCRouter({
  listByTracker: protectedProcedure
    .input(z.object({ trackerId: z.string().min(1) }))
    .query(async ({ input }) => {
      const tracker = await getProjectTrackerById(input.trackerId);
      if (!tracker) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Tracker not found" });
      }
      return getViewsByTrackerId(input.trackerId);
    }),

  create: protectedProcedure
    .input(createViewSchema)
    .mutation(async ({ ctx, input }) => {
      const tracker = await getProjectTrackerById(input.trackerId);
      if (!tracker) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Tracker not found" });
      }
      return createView({ ...input, createdBy: ctx.user.id });
    }),

  update: protectedProcedure
    .input(updateViewSchema)
    .mutation(async ({ input }) => {
      const { viewId, ...fields } = input;
      const updated = await updateView({ viewId, ...fields });
      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "View not found" });
      }
      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ viewId: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const deleted = await deleteView(input.viewId);
      if (!deleted) {
        throw new TRPCError({ code: "NOT_FOUND", message: "View not found" });
      }
      return { success: true };
    }),
});
