import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { PROJECT_STAGE_VALUES } from "@repo/enums";
import { createTRPCRouter, protectedProcedure } from "../init";
import {
  getAllProjectTrackers,
  getProjectTrackerById,
} from "@repo/db-tracker/queries";
import {
  deleteProjectTracker,
  updateProjectTrackerStage,
} from "@repo/db-tracker/mutations";

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

  updateStage: protectedProcedure
    .input(
      z.object({
        trackerId: z.string().min(1),
        stage: z.enum(PROJECT_STAGE_VALUES),
        note: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const result = await updateProjectTrackerStage({
        trackerId: input.trackerId,
        stage: input.stage,
        changedBy: ctx.session.user.id,
        note: input.note,
      });

      if (!result) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project tracker not found",
        });
      }

      return result;
    }),
});
