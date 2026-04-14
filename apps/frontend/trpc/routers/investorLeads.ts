import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import { after } from "@/lib/after";
import { revalidatePath, revalidateTag } from "@/lib/cache-invalidation";
import { convertInvestorLeadToInvestorSchema } from "@/lib/schemas";
import {
  insertInvestorLeadRow,
  listInvestorLeadInteractions,
  insertInvestorLeadInteraction,
  updateInvestorLeadInteractionById,
  deleteInvestorLeadInteractionById,
  updateInvestorLeadById,
  deleteInvestorLeadById,
  convertInvestorLeadToInvestorTx,
} from "@repo/db/mutations";

const investorLeadStatusEnum = z.enum([
  "RAW",
  "CONTACTED",
  "ENGAGED",
  "QUALIFIED",
  "REJECTED",
]);

const investorInteractionTypeEnum = z.enum([
  "EMAIL",
  "CALL",
  "MEETING",
  "EVENT",
  "INTRO",
]);

const investorLeadSchema = z.object({
  name: z.string().optional(),
  source: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  inferredType: z.string().optional(),
  notes: z.string().optional(),
  status: investorLeadStatusEnum.optional(),
  ownerUserId: z.string().optional(),
});

export const investorLeadsRouter = createTRPCRouter({
  create: protectedProcedure
    .input(investorLeadSchema)
    .mutation(async ({ input, ctx }) => {
      const added = await insertInvestorLeadRow({
        name: input.name || null,
        source: input.source || null,
        email: input.email || null,
        phone: input.phone || null,
        inferredType: input.inferredType || null,
        notes: input.notes || null,
        status: input.status ?? "RAW",
        ownerUserId: input.ownerUserId || ctx.session?.user?.id || null,
      });

      after(async () => {
        revalidatePath("/investor-leads");
        revalidateTag("investor-leads", "max");
      });
      return { investorLeadId: added?.id };
    }),

  listInteractions: protectedProcedure
    .input(z.object({ investorLeadId: z.string() }))
    .query(async ({ input }) => {
      return listInvestorLeadInteractions(input.investorLeadId);
    }),

  createInteraction: protectedProcedure
    .input(
      z.object({
        investorLeadId: z.string(),
        type: investorInteractionTypeEnum,
        notes: z.string().optional(),
        outcome: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const added = await insertInvestorLeadInteraction({
        investorLeadId: input.investorLeadId,
        investorId: null,
        type: input.type,
        notes: input.notes || null,
        outcome: input.outcome || null,
      });

      after(async () => {
        revalidatePath(`/investor-leads/${input.investorLeadId}`);
        revalidateTag(`investor-lead-${input.investorLeadId}`, "max");
      });

      return { investorInteractionId: added?.id };
    }),

  updateInteraction: protectedProcedure
    .input(
      z.object({
        investorLeadId: z.string(),
        id: z.string(),
        type: investorInteractionTypeEnum.optional(),
        notes: z.string().optional(),
        outcome: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { investorLeadId, id, ...data } = input;

      const updates: {
        type?: "EMAIL" | "CALL" | "MEETING" | "EVENT" | "INTRO" | null;
        notes?: string | null;
        outcome?: string | null;
      } = {};

      if (data.type !== undefined) updates.type = data.type;
      if (data.notes !== undefined) updates.notes = data.notes || null;
      if (data.outcome !== undefined) updates.outcome = data.outcome || null;

      if (Object.keys(updates).length === 0) return { investorInteractionId: id };

      await updateInvestorLeadInteractionById(id, updates);

      after(async () => {
        revalidatePath(`/investor-leads/${investorLeadId}`);
        revalidateTag(`investor-lead-${investorLeadId}`, "max");
      });

      return { investorInteractionId: id };
    }),

  deleteInteraction: protectedProcedure
    .input(z.object({ investorLeadId: z.string(), id: z.string() }))
    .mutation(async ({ input }) => {
      await deleteInvestorLeadInteractionById(input.id);

      after(async () => {
        revalidatePath(`/investor-leads/${input.investorLeadId}`);
        revalidateTag(`investor-lead-${input.investorLeadId}`, "max");
      });

      return { success: true };
    }),

  update: protectedProcedure
    .input(investorLeadSchema.extend({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      const updates: {
        name?: string | null;
        source?: string | null;
        email?: string | null;
        phone?: string | null;
        inferredType?: string | null;
        notes?: string | null;
        status?: "RAW" | "CONTACTED" | "ENGAGED" | "QUALIFIED" | "REJECTED";
        ownerUserId?: string | null;
      } = {};
      if (data.name !== undefined) updates.name = data.name || null;
      if (data.source !== undefined) updates.source = data.source || null;
      if (data.email !== undefined) updates.email = data.email || null;
      if (data.phone !== undefined) updates.phone = data.phone || null;
      if (data.inferredType !== undefined)
        updates.inferredType = data.inferredType || null;
      if (data.notes !== undefined) updates.notes = data.notes || null;
      if (data.status !== undefined) updates.status = data.status;
      if (data.ownerUserId !== undefined)
        updates.ownerUserId =
          data.ownerUserId || ctx.session?.user?.id || null;
      if (Object.keys(updates).length === 0) return { investorLeadId: id };
      await updateInvestorLeadById(id, updates);

      after(async () => {
        revalidatePath("/investor-leads");
        revalidatePath(`/investor-leads/${id}`);
        revalidatePath(`/investor-leads/${id}/edit`);
        revalidateTag("investor-leads", "max");
        revalidateTag(`investor-lead-${id}`, "max");
      });
      return { investorLeadId: id };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await deleteInvestorLeadById(input.id);
      after(async () => {
        revalidatePath("/investor-leads");
        revalidateTag("investor-leads", "max");
        revalidateTag(`investor-lead-${input.id}`, "max");
      });
      return { success: true };
    }),

  convertToInvestor: protectedProcedure
    .input(convertInvestorLeadToInvestorSchema)
    .mutation(async ({ input }) => {
      const { investorLeadId, ...investorData } = input;

      const result = await convertInvestorLeadToInvestorTx({
        investorLeadId,
        investorValues: {
          name: investorData.name,
          type: investorData.type,
          primaryContactName: investorData.primaryContactName || null,
          email: investorData.email || null,
          phone: investorData.phone || null,
          geography: investorData.geography || null,
          minCheckSize: investorData.minCheckSize || null,
          maxCheckSize: investorData.maxCheckSize || null,
          sectorFocus: investorData.sectorFocus
            ? investorData.sectorFocus
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            : null,
          stagePreference: investorData.stagePreference
            ? investorData.stagePreference
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            : null,
          riskProfile: investorData.riskProfile || null,
          status: investorData.status ?? "PROSPECT",
          firstSeenFromInvestorLeadId: investorLeadId,
        },
      });

      after(async () => {
        revalidatePath("/investor-leads");
        revalidatePath(`/investor-leads/${investorLeadId}`);
        revalidatePath("/investors");
        revalidatePath(`/investors/${result.investorId}`);
        revalidateTag("investor-leads", "max");
        revalidateTag(`investor-lead-${investorLeadId}`, "max");
        revalidateTag("investors", "max");
        revalidateTag(`investor-${result.investorId}`, "max");
      });

      return { investorId: result.investorId };
    }),
});
