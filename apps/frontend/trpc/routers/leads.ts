import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import db, { leads, companies, dealOpportunities, eq } from "@repo/db";
import { GetCompanyByFirstSeenFromLeadId } from "@repo/db/queries";
import { leadFormSchema } from "@/lib/schemas";
import { revalidatePath, revalidateTag } from "next/cache";

const convertToCompanySchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Company name is required"),
  normalizedName: z.string().min(1, "Normalized name is required"),
  industry: z.string().optional(),
  location: z.string().optional(),
  revenueEstimate: z.coerce.number().optional(),
  ebitdaEstimate: z.coerce.number().optional(),
});

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
        .where(eq(leads.id, id));

      revalidatePath("/leads");
      revalidatePath(`/leads/${id}`);
      revalidatePath(`/leads/${id}/edit`);
      revalidateTag("leads", "max");
      revalidateTag(`lead-${id}`, "max");
      return { leadId: id };
    }),

  /**
   * Hard delete a lead
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await db.delete(leads).where(eq(leads.id, input.id));
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
        .where(eq(leads.id, input.id));

      revalidatePath("/leads");
      revalidatePath(`/leads/${input.id}`);
      revalidateTag("leads", "max");
      revalidateTag(`lead-${input.id}`, "max");

      return { leadId: input.id };
    }),

  /**
   * Check if a lead has already been converted to a company.
   */
  getConvertedCompany: protectedProcedure
    .input(z.object({ leadId: z.string() }))
    .query(async ({ input }) => {
      const company = await GetCompanyByFirstSeenFromLeadId(input.leadId);
      return company ? { companyId: company.id } : null;
    }),

  /**
   * Convert a lead into a company + deal opportunity
   */
  convertToCompany: protectedProcedure
    .input(convertToCompanySchema)
    .mutation(async ({ input }) => {
      const leadId = input.id;

      const existingCompany = await GetCompanyByFirstSeenFromLeadId(leadId);
      if (existingCompany) {
        return {
          alreadyConverted: true,
          companyId: existingCompany.id,
          leadId,
          dealOpportunityId: null,
        };
      }

      const lead = await db.query.leads.findFirst({
        where(fields, operators) {
          return operators.eq(fields.id, leadId);
        },
      });

      if (!lead) {
        throw new Error("Lead not found");
      }

      const [createdCompany] = await db
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
        .returning();

      if (!createdCompany) {
        throw new Error("Failed to create company from lead");
      }

      const [createdOpp] = await db
        .insert(dealOpportunities)
        .values({
          companyId: createdCompany.id,
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

      await db
        .update(leads)
        .set({
          status: "PROCESSED",
          processedAt: new Date(),
        })
        .where(eq(leads.id, lead.id));

      revalidatePath("/leads");
      revalidatePath("/companies");
      revalidatePath(`/companies/${createdCompany.id}`);
      revalidateTag("leads", "max");
      revalidateTag(`lead-${lead.id}`, "max");
      revalidateTag("companies", "max");
      revalidateTag(`company-${createdCompany.id}`, "max");

      return {
        leadId: lead.id,
        companyId: createdCompany.id,
        dealOpportunityId: createdOpp?.id ?? null,
      };
    }),
});
