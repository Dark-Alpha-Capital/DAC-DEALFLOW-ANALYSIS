import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import db, { deals, eq, DealType } from "@repo/db";
import { DeleteQuestionnaireById, DeleteReasoningById } from "@repo/db/mutations";
import { del } from "@vercel/blob";
import { after } from "@/lib/after";
import { revalidatePath } from "@/lib/cache-invalidation";

const inferDealSchema = z.object({
  sourceWebsite: z.string().optional().nullable(),
  brokerage: z.string().optional().nullable(),
  firstName: z.string().optional().nullable(),
  lastName: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  companyLocation: z.string().optional().nullable(),
  dealCaption: z.string().optional().nullable(),
  industry: z.string().optional().nullable(),
  askingPrice: z.number().optional().nullable(),
  revenue: z.number().optional().nullable(),
  grossRevenue: z.number().optional().nullable(),
  ebitda: z.number().optional().nullable(),
  ebitdaMargin: z.number().optional().nullable(),
  title: z.string(),
});

export const miscRouter = createTRPCRouter({
  deleteBaseline: protectedProcedure
    .input(z.object({ blobUrl: z.string(), questionnaireId: z.string() }))
    .mutation(async ({ input }) => {
      await Promise.all([
        del(input.blobUrl),
        DeleteQuestionnaireById(input.questionnaireId),
      ]);

      after(async () => {
        revalidatePath("/questionnaires");
      });
      return { success: true };
    }),

  deleteReasoning: protectedProcedure
    .input(z.object({ reasoningId: z.string(), dealId: z.string() }))
    .mutation(async ({ input }) => {
      await DeleteReasoningById(input.reasoningId);

      after(async () => {
        revalidatePath(`/raw-deals/${input.dealId}/reasonings`);
      });
      return { success: true };
    }),

  saveInferredDeal: protectedProcedure
    .input(inferDealSchema)
    .mutation(async ({ input, ctx }) => {
      const [docRef] = await db
        .insert(deals)
        .values({
          sourceWebsite: input.sourceWebsite || "",
          firstName: input.firstName || "",
          lastName: input.lastName || "",
          email: input.email || "",
          companyLocation: input.companyLocation || "",
          dealCaption: input.dealCaption || "",
          industry: input.industry || "",
          askingPrice: input.askingPrice || 0,
          revenue: input.revenue || 0,
          grossRevenue: input.grossRevenue || 0,
          title: input.title || "",
          ebitda: input.ebitda || 0,
          ebitdaMargin: input.ebitdaMargin || 0,
          brokerage: input.brokerage || "Not Mentioned",
          dealType: DealType.AI_INFERRED,
          userId: ctx.user.id,
        })
        .returning();

      return { dealId: docRef?.id };
    }),
});
