import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../init";
import { getProjectTrackerById, getCyclesByTrackerId } from "@repo/db-tracker/queries";
import {
  createCycle,
  updateCycle,
  completeCycle,
  deleteCycle,
} from "@repo/db-tracker/mutations";
import { createCycleSchema, updateCycleSchema, completeCycleSchema } from "@repo/schemas";

export const cyclesRouter = createTRPCRouter({
  listByTracker: protectedProcedure
    .input(z.object({ trackerId: z.string().min(1) }))
    .query(async ({ input }) => {
      const tracker = await getProjectTrackerById(input.trackerId);
      if (!tracker) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Tracker not found" });
      }
      return getCyclesByTrackerId(input.trackerId);
    }),

  create: protectedProcedure
    .input(createCycleSchema)
    .mutation(async ({ ctx, input }) => {
      const tracker = await getProjectTrackerById(input.trackerId);
      if (!tracker) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Tracker not found" });
      }
      return createCycle({ ...input, createdBy: ctx.user.id });
    }),

  update: protectedProcedure
    .input(updateCycleSchema)
    .mutation(async ({ input }) => {
      const { cycleId, ...fields } = input;
      const updated = await updateCycle({ cycleId, ...fields });
      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Cycle not found" });
      }
      return updated;
    }),

  complete: protectedProcedure
    .input(completeCycleSchema)
    .mutation(async ({ input }) => {
      const result = await completeCycle(input.cycleId, input.targetCycleId ?? null);
      if (!result) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Cycle not found" });
      }
      return result;
    }),

  delete: protectedProcedure
    .input(z.object({ cycleId: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const deleted = await deleteCycle(input.cycleId);
      if (!deleted) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Cycle not found" });
      }
      return { success: true };
    }),
});
