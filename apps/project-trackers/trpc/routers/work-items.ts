import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../init";
import { getProjectTrackerById, getWorkItemsByTrackerId } from "@repo/db-tracker/queries";
import {
  createWorkItem,
  updateWorkItem,
  deleteWorkItem,
} from "@repo/db-tracker/mutations";
import {
  createWorkItemSchema,
  updateWorkItemSchema,
} from "@repo/schemas";

export const workItemsRouter = createTRPCRouter({
  listByTracker: protectedProcedure
    .input(z.object({ trackerId: z.string().min(1) }))
    .query(async ({ input }) => {
      const tracker = await getProjectTrackerById(input.trackerId);
      if (!tracker) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project tracker not found",
        });
      }
      return getWorkItemsByTrackerId(input.trackerId);
    }),

  create: protectedProcedure
    .input(createWorkItemSchema)
    .mutation(async ({ ctx, input }) => {
      const tracker = await getProjectTrackerById(input.trackerId);
      if (!tracker) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project tracker not found",
        });
      }

      return createWorkItem({
        trackerId: input.trackerId,
        title: input.title,
        description: input.description,
        status: input.status,
        priority: input.priority,
        epicId: input.epicId ?? null,
        cycleId: input.cycleId ?? null,
        moduleId: input.moduleId ?? null,
        startDate: input.startDate ?? null,
        dueDate: input.dueDate ?? null,
        estimatePoints: input.estimatePoints ?? null,
        estimateHours: input.estimateHours ?? null,
        tags: input.tags,
        createdBy: ctx.session.user.id,
      });
    }),

  update: protectedProcedure
    .input(updateWorkItemSchema)
    .mutation(async ({ input }) => {
      const { workItemId, ...fields } = input;
      const updated = await updateWorkItem({ workItemId, ...fields });
      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Work item not found",
        });
      }
      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ workItemId: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const deleted = await deleteWorkItem(input.workItemId);
      if (!deleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Work item not found",
        });
      }
      return { success: true };
    }),
});
