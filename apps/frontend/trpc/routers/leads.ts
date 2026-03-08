import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import db, {
  leads,
  companies,
  dealOpportunities,
  eq,
  and,
  isNull,
  desc,
} from "@repo/db";
import { convertLeadToCompanySchema, leadFormSchema } from "@/lib/schemas";
import { revalidatePath, revalidateTag } from "next/cache";

const createLeadSchema = leadFormSchema;

export const leadsRouter = createTRPCRouter({
  /**
   * Create a new lead
   */
  create: protectedProcedure
    .input(createLeadSchema)
    .mutation(async ({ input }) => {
      const [added] = await db
        .insert(leads)
        .values({
          sourceWebsite: input.sourceWebsite,
          externalListingId: input.externalListingId,
          rawTitle: input.rawTitle,
          rawDescription: input.rawDescription,
          rawIndustry: input.rawIndustry,
          revenue: input.revenue,
          ebitda: input.ebitda,
          askingPrice: input.askingPrice,
          brokerage: input.brokerage,
          brokerFirstName: input.brokerFirstName,
          brokerLastName: input.brokerLastName,
          brokerEmail: input.brokerEmail || null,
          brokerPhone: input.brokerPhone,
          normalizedCompanyName: input.normalizedCompanyName,
          companyLocation: input.companyLocation,
        })
        .returning();

      revalidatePath("/leads");
      revalidateTag("leads", "max");
      return { leadId: added?.id };
    }),

  /**
   * Update an existing lead
   */
  update: protectedProcedure
    .input(leadFormSchema.extend({ id: z.string() }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db
        .update(leads)
        .set({
          sourceWebsite: data.sourceWebsite,
          externalListingId: data.externalListingId || null,
          rawTitle: data.rawTitle,
          rawDescription: data.rawDescription || null,
          rawIndustry: data.rawIndustry || null,
          revenue: data.revenue ?? null,
          ebitda: data.ebitda ?? null,
          askingPrice: data.askingPrice ?? null,
          brokerage: data.brokerage || null,
          brokerFirstName: data.brokerFirstName || null,
          brokerLastName: data.brokerLastName || null,
          brokerEmail: data.brokerEmail || null,
          brokerPhone: data.brokerPhone || null,
          normalizedCompanyName: data.normalizedCompanyName || null,
          companyLocation: data.companyLocation || null,
        })
        .where(and(eq(leads.id, id), isNull(leads.deletedAt)));

      revalidatePath("/leads");
      revalidatePath(`/leads/${id}`);
      revalidatePath(`/leads/${id}/edit`);
      revalidateTag("leads", "max");
      revalidateTag(`lead-${id}`, "max");
      return { leadId: id };
    }),

  /**
   * Soft delete a lead
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await db
        .update(leads)
        .set({ deletedAt: new Date() })
        .where(and(eq(leads.id, input.id), isNull(leads.deletedAt)));
      revalidatePath("/leads");
      revalidateTag("leads", "max");
      revalidateTag(`lead-${input.id}`, "max");
      return { success: true };
    }),

  /**
   * Mark a lead as rejected
   */
  reject: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await db
        .update(leads)
        .set({
          status: "REJECTED",
          processedAt: new Date(),
        })
        .where(and(eq(leads.id, input.id), isNull(leads.deletedAt)));

      revalidatePath("/leads");
      revalidatePath(`/leads/${input.id}`);
      revalidateTag("leads", "max");
      revalidateTag(`lead-${input.id}`, "max");

      return { leadId: input.id };
    }),

  /**
   * Convert a lead into a company + deal opportunity
   */
  convertToCompany: protectedProcedure
    .input(convertLeadToCompanySchema)
    .mutation(async ({ input }) => {
      const leadId = input.id;
      const result = await db.transaction(async (tx) => {
        const [lead] = await tx
          .select()
          .from(leads)
          .where(and(eq(leads.id, leadId), isNull(leads.deletedAt)))
          .limit(1);

        if (!lead) {
          throw new Error("Lead not found");
        }

        const [insertedCompany] = await tx
          .insert(companies)
          .values({
            name: input.name,
            normalizedName: input.normalizedName,
            industry: input.industry || lead.rawIndustry || null,
            location: input.location || lead.companyLocation || null,
            revenueEstimate: input.revenueEstimate ?? lead.revenue ?? null,
            ebitdaEstimate: input.ebitdaEstimate ?? lead.ebitda ?? null,
            firstSeenFromLeadId: lead.id,
            coverageStatus: "UNCONTACTED",
          })
          .onConflictDoNothing({ target: companies.firstSeenFromLeadId })
          .returning();

        const [company] = insertedCompany
          ? [insertedCompany]
          : await tx
            .select()
            .from(companies)
            .where(eq(companies.firstSeenFromLeadId, lead.id))
            .orderBy(desc(companies.createdAt), desc(companies.id))
            .limit(1);

        if (!company) {
          throw new Error("Failed to resolve company from lead conversion");
        }

        if (company.deletedAt) {
          const [restoredCompany] = await tx
            .update(companies)
            .set({ deletedAt: null })
            .where(eq(companies.id, company.id))
            .returning();
          if (!restoredCompany) {
            throw new Error("Failed to restore previously soft-deleted company");
          }
        }

        const [existingOpp] = await tx
          .select({ id: dealOpportunities.id })
          .from(dealOpportunities)
          .where(
            and(
              eq(dealOpportunities.companyId, company.id),
              eq(dealOpportunities.leadId, lead.id),
            ),
          )
          .orderBy(desc(dealOpportunities.createdAt), desc(dealOpportunities.id))
          .limit(1);

        const [createdOpp] = existingOpp
          ? [null]
          : await tx
            .insert(dealOpportunities)
            .values({
              companyId: company.id,
              leadId: lead.id,
              sourceWebsite: lead.sourceWebsite,
              brokerage: lead.brokerage,
              revenue: lead.revenue ?? null,
              ebitda: lead.ebitda ?? null,
              askingPrice: lead.askingPrice ?? null,
              dealTeaser: lead.rawTitle,
              description: lead.rawDescription,
              dealType: "MANUAL",
            })
            .returning();

        if (lead.status !== "PROCESSED" || !lead.processedAt) {
          await tx
            .update(leads)
            .set({
              status: "PROCESSED",
              processedAt: lead.processedAt ?? new Date(),
            })
            .where(eq(leads.id, lead.id));
        }

        return {
          leadId: lead.id,
          companyId: company.id,
          dealOpportunityId: existingOpp?.id ?? createdOpp?.id ?? null,
          alreadyConverted: !insertedCompany,
        };
      });

      revalidatePath("/leads");
      revalidatePath("/companies");
      revalidatePath(`/companies/${result.companyId}`);
      revalidateTag("leads", "max");
      revalidateTag(`lead-${result.leadId}`, "max");
      revalidateTag("companies", "max");
      revalidateTag(`company-${result.companyId}`, "max");

      return result;
    }),
});
