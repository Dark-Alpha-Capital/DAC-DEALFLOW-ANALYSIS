import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../init";
import {
  getAllProjectTrackers,
  getProjectTrackerById,
} from "@repo/db/queries";
import {
  deleteProjectTracker,
  updateProjectKickoffById,
} from "@repo/db/mutations";
import { editProjectKickoffSchema } from "@repo/schemas";

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
    .input(
      z.object({
        trackerId: z.string().min(1),
        sourceId: z.string().nullable(),
      }),
    )
    .mutation(async ({ input }) => {
      await deleteProjectTracker(input.trackerId, input.sourceId);
      return { success: true };
    }),

  update: protectedProcedure
    .input(editProjectKickoffSchema.extend({ kickoffId: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const { kickoffId, ...values } = input;
      await updateProjectKickoffById(kickoffId, values);
      return { kickoffId };
    }),
});
