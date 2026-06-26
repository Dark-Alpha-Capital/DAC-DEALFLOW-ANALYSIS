import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../init";
import {
  getAllInitiatives,
  getInitiativeById,
  getTrackerIdsForInitiative,
  getInitiativeIdsForTracker,
} from "@repo/db-tracker/queries";
import {
  createInitiative,
  updateInitiative,
  deleteInitiative,
  linkTrackerToInitiative,
  unlinkTrackerFromInitiative,
} from "@repo/db-tracker/mutations";
import {
  createInitiativeSchema,
  updateInitiativeSchema,
  linkInitiativeTrackerSchema,
} from "@repo/schemas";

export const initiativesRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async () => {
    return getAllInitiatives();
  }),

  getById: protectedProcedure
    .input(z.object({ initiativeId: z.string().min(1) }))
    .query(async ({ input }) => {
      const initiative = await getInitiativeById(input.initiativeId);
      if (!initiative) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Initiative not found" });
      }
      const trackerIds = await getTrackerIdsForInitiative(input.initiativeId);
      return { initiative, trackerIds };
    }),

  getByTracker: protectedProcedure
    .input(z.object({ trackerId: z.string().min(1) }))
    .query(async ({ input }) => {
      const initiativeIds = await getInitiativeIdsForTracker(input.trackerId);
      if (initiativeIds.length === 0) return [];
      const initiatives = await Promise.all(
        initiativeIds.map((id) => getInitiativeById(id)),
      );
      return initiatives.filter(Boolean);
    }),

  create: protectedProcedure
    .input(createInitiativeSchema)
    .mutation(async ({ ctx, input }) => {
      return createInitiative({ ...input, createdBy: ctx.user.id });
    }),

  update: protectedProcedure
    .input(updateInitiativeSchema)
    .mutation(async ({ input }) => {
      const { initiativeId, ...fields } = input;
      const updated = await updateInitiative({ initiativeId, ...fields });
      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Initiative not found" });
      }
      return updated;
    }),

  linkTracker: protectedProcedure
    .input(linkInitiativeTrackerSchema)
    .mutation(async ({ input }) => {
      await linkTrackerToInitiative(input.initiativeId, input.trackerId);
      return { success: true };
    }),

  unlinkTracker: protectedProcedure
    .input(linkInitiativeTrackerSchema)
    .mutation(async ({ input }) => {
      await unlinkTrackerFromInitiative(input.initiativeId, input.trackerId);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ initiativeId: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const deleted = await deleteInitiative(input.initiativeId);
      if (!deleted) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Initiative not found" });
      }
      return { success: true };
    }),
});
