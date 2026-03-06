import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import db, { leads, companies, dealOpportunities, eq } from "@repo/db";
import { revalidatePath, revalidateTag } from "next/cache";

const leadSchema = z.object({
  sourceWebsite: z.string().min(1, "Source website is required"),
  externalListingId: z.string().optional(),
  rawTitle: z.string().min(1, "Title is required"),
  rawDescription: z.string().optional(),
  rawIndustry: z.string().optional(),
  revenue: z.coerce.number().optional(),
  ebitda: z.coerce.number().optional(),
  askingPrice: z.coerce.number().optional(),
  brokerage: z.string().optional(),
  brokerFirstName: z.string().optional(),
  brokerLastName: z.string().optional(),
  brokerEmail: z
    .union([z.string().email("Invalid email"), z.literal("")])
    .optional(),
  brokerPhone: z.string().optional(),
  normalizedCompanyName: z.string().optional(),
  companyLocation: z.string().optional(),
});

const createLeadSchema = leadSchema;

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
    .input(leadSchema.extend({ id: z.string() }))
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
   * Convert a lead into a company + deal opportunity
   */
  convertToCompany: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const leadId = input.id;

      const lead = await db.query.leads.findFirst({
        where(fields, operators) {
          return operators.eq(fields.id, leadId);
        },
      });

      if (!lead) {
        throw new Error("Lead not found");
      }

      const normalizedNameSource =
        lead.normalizedCompanyName?.trim() || lead.rawTitle?.trim();

      if (!normalizedNameSource) {
        throw new Error("Lead is missing a title or normalized company name");
      }

      const companyName = lead.normalizedCompanyName || lead.rawTitle;

      const [createdCompany] = await db
        .insert(companies)
        .values({
          name: companyName,
          normalizedName: normalizedNameSource,
          industry: lead.rawIndustry || null,
          location: lead.companyLocation || null,
          revenueEstimate: lead.revenue ?? null,
          ebitdaEstimate: lead.ebitda ?? null,
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
