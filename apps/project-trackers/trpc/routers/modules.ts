import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../init";
import { getProjectTrackerById, getModulesByTrackerId } from "@repo/db-tracker/queries";
import {
  createModule,
  updateModule,
  deleteModule,
} from "@repo/db-tracker/mutations";
import { createModuleSchema, updateModuleSchema } from "@repo/schemas";

export const modulesRouter = createTRPCRouter({
  listByTracker: protectedProcedure
    .input(z.object({ trackerId: z.string().min(1) }))
    .query(async ({ input }) => {
      const tracker = await getProjectTrackerById(input.trackerId);
      if (!tracker) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Tracker not found" });
      }
      return getModulesByTrackerId(input.trackerId);
    }),

  create: protectedProcedure
    .input(createModuleSchema)
    .mutation(async ({ ctx, input }) => {
      const tracker = await getProjectTrackerById(input.trackerId);
      if (!tracker) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Tracker not found" });
      }
      return createModule({ ...input });
    }),

  update: protectedProcedure
    .input(updateModuleSchema)
    .mutation(async ({ input }) => {
      const { moduleId, ...fields } = input;
      const updated = await updateModule({ moduleId, ...fields });
      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Module not found" });
      }
      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ moduleId: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const deleted = await deleteModule(input.moduleId);
      if (!deleted) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Module not found" });
      }
      return { success: true };
    }),
});
