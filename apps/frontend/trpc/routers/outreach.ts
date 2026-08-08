import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import {
  getDealOpportunityIdAndCompanyId,
  insertOutreachRow,
} from "@repo/db/mutations";

const outreachTypes = ["EMAIL", "CALL", "LINKEDIN", "MEETING"] as const;

const createOutreachSchema = z
  .object({
    companyId: z.string().optional(),
    dealOpportunityId: z.string().optional(),
    type: z.enum(outreachTypes),
    outcome: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine(
    (data) =>
      Boolean(data.companyId?.trim()) || Boolean(data.dealOpportunityId?.trim()),
    {
      message: "Provide a company or a deal opportunity",
      path: ["companyId"],
    },
  );

export const outreachRouter = createTRPCRouter({
  create: protectedProcedure
    .input(createOutreachSchema)
    .mutation(async ({ input, ctx }) => {
      const companyId = input.companyId?.trim() || null;
      const dealOpportunityId = input.dealOpportunityId?.trim() || null;

      if (dealOpportunityId) {
        const dealRow = await getDealOpportunityIdAndCompanyId(dealOpportunityId);

        if (!dealRow) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Deal opportunity not found",
          });
        }

        if (companyId) {
          if (
            dealRow.companyId != null &&
            dealRow.companyId !== companyId
          ) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message:
                "Selected deal opportunity is not linked to this company",
            });
          }
        }
      }

      const added = await insertOutreachRow({
        companyId,
        dealOpportunityId,
        type: input.type,
        outcome: input.outcome?.trim() || null,
        notes: input.notes?.trim() || null,
        createdById: ctx.user.id,
      });

      return { outreachId: added?.id };
    }),
});
