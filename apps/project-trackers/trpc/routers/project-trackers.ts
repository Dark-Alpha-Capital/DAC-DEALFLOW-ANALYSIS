import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../init";
import {
  getAllProjectTrackers,
  getProjectTrackerById,
} from "@repo/db-tracker/queries";
import { deleteProjectTracker } from "@repo/db-tracker/mutations";

export const projectTrackersRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async () => {
    return getAllProjectTrackers();
  }),

  getById: protectedProcedure
    .input(z.object({ trackerId: z.string() }))
    .query(async ({ input }) => {
      const result = await getProjectTrackerById(input.trackerId);
      if (!result) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project tracker not found",
        });
      }
      return result;
    }),

  delete: protectedProcedure
    .input(z.object({ kickoffId: z.string().min(1) }))
    .mutation(async ({ input }) => {
      await deleteProjectTracker(input.kickoffId);
      return { success: true };
    }),
});
