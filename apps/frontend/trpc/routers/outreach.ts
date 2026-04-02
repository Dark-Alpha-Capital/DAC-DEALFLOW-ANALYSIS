import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import db, { outreach, dealOpportunities, eq, and } from "@repo/db";
import { after } from "@/lib/after";
import { revalidatePath, revalidateTag } from "@/lib/cache-invalidation";

const outreachTypes = ["EMAIL", "CALL", "LINKEDIN", "MEETING"] as const;

const createOutreachSchema = z.object({
  companyId: z.string().min(1, "Company ID is required"),
  dealOpportunityId: z.string().optional(),
  type: z.enum(outreachTypes),
  outcome: z.string().optional(),
  notes: z.string().optional(),
});

export const outreachRouter = createTRPCRouter({
  create: protectedProcedure
    .input(createOutreachSchema)
    .mutation(async ({ input, ctx }) => {
      if (input.dealOpportunityId) {
        const [matchingDeal] = await db
          .select({
            id: dealOpportunities.id,
          })
          .from(dealOpportunities)
          .where(
            and(
              eq(dealOpportunities.id, input.dealOpportunityId),
              eq(dealOpportunities.companyId, input.companyId),
            ),
          )
          .limit(1);

        if (!matchingDeal) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Selected deal opportunity does not belong to this company",
          });
        }
      }

      const [added] = await db
        .insert(outreach)
        .values({
          companyId: input.companyId,
          dealOpportunityId: input.dealOpportunityId ?? null,
          type: input.type,
          outcome: input.outcome?.trim() || null,
          notes: input.notes?.trim() || null,
          createdById: ctx.user.id,
        })
        .returning();

      after(async () => {
        revalidatePath("/companies");
        revalidatePath(`/companies/${input.companyId}`);
        revalidateTag("companies", "max");
        revalidateTag(`company-${input.companyId}`, "max");
        if (input.dealOpportunityId) {
          revalidateTag(`deal-${input.dealOpportunityId}`, "max");
        }
      });
      return { outreachId: added?.id };
    }),
});
