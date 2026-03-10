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
  ilike,
} from "@repo/db";
import { convertLeadToCompanySchema, leadFormSchema } from "@/lib/schemas";
import { revalidatePath, revalidateTag } from "next/cache";
import { upsertDealOpportunityScreening } from "@repo/deal-screening";

const createLeadSchema = leadFormSchema;

function normalizeText(value?: string | null): string {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeLocation(value?: string | null): string {
  return (value ?? "").toLowerCase().replace(/\s+/g, " ").trim();
}

function scoreDuplicateCandidate(
  lead: {
    normalizedCompanyName: string | null;
    rawTitle: string;
    companyLocation: string | null;
  },
  company: {
    name: string;
    normalizedName: string;
    location: string | null;
  },
) {
  const reasons: string[] = [];
  let score = 0;

  const leadNormalized = normalizeText(lead.normalizedCompanyName || lead.rawTitle);
  const companyNormalized = normalizeText(company.normalizedName || company.name);
  const leadTitle = normalizeText(lead.rawTitle);
  const companyName = normalizeText(company.name);

  if (leadNormalized && companyNormalized && leadNormalized === companyNormalized) {
    score += 0.75;
    reasons.push("Exact normalized-name match");
  } else {
    if (leadNormalized && companyNormalized && (
      leadNormalized.includes(companyNormalized) ||
      companyNormalized.includes(leadNormalized)
    )) {
      score += 0.35;
      reasons.push("Strong name overlap");
    }

    if (leadTitle && companyName && (
      leadTitle.includes(companyName) ||
      companyName.includes(leadTitle)
    )) {
      score += 0.2;
      reasons.push("Title/name overlap");
    }
  }

  const leadLocation = normalizeLocation(lead.companyLocation);
  const companyLocation = normalizeLocation(company.location);
  if (leadLocation && companyLocation && leadLocation === companyLocation) {
    score += 0.15;
    reasons.push("Location match");
  }

  return {
    score: Math.min(1, Number(score.toFixed(2))),
    reasons,
  };
}

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
          duplicateCompanyId: null,
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
   * Suggest duplicate company candidates for a lead.
   */
  duplicateCandidates: protectedProcedure
    .input(
      z.object({
        leadId: z.string(),
        limit: z.number().int().min(1).max(50).default(8),
        query: z.string().trim().optional(),
      }),
    )
    .query(async ({ input }) => {
      const [lead] = await db
        .select({
          id: leads.id,
          normalizedCompanyName: leads.normalizedCompanyName,
          rawTitle: leads.rawTitle,
          companyLocation: leads.companyLocation,
          deletedAt: leads.deletedAt,
        })
        .from(leads)
        .where(eq(leads.id, input.leadId))
        .limit(1);

      if (!lead || lead.deletedAt) {
        throw new Error("Lead not found");
      }

      const searchTerm = input.query?.trim();
      const predicates = [isNull(companies.deletedAt)];
      if (searchTerm) {
        predicates.push(ilike(companies.name, `%${searchTerm}%`));
      }

      const companyRows = await db
        .select({
          id: companies.id,
          name: companies.name,
          normalizedName: companies.normalizedName,
          location: companies.location,
          industry: companies.industry,
        })
        .from(companies)
        .where(and(...predicates))
        .orderBy(desc(companies.updatedAt))
        .limit(searchTerm ? Math.max(input.limit, 20) : 100);

      const scored = companyRows
        .map((company) => {
          const { score, reasons } = scoreDuplicateCandidate(lead, company);
          return {
            ...company,
            score,
            reasons,
          };
        })
        .filter((company) => searchTerm || company.score > 0)
        .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
        .slice(0, input.limit);

      return scored;
    }),

  /**
   * Mark a lead as duplicate of an existing company.
   */
  markDuplicate: protectedProcedure
    .input(
      z.object({
        leadId: z.string(),
        companyId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const result = await db.transaction(async (tx) => {
        const [lead] = await tx
          .select({
            id: leads.id,
            deletedAt: leads.deletedAt,
            processedAt: leads.processedAt,
          })
          .from(leads)
          .where(eq(leads.id, input.leadId))
          .limit(1);

        if (!lead || lead.deletedAt) {
          throw new Error("Lead not found");
        }

        const [company] = await tx
          .select({
            id: companies.id,
            deletedAt: companies.deletedAt,
          })
          .from(companies)
          .where(eq(companies.id, input.companyId))
          .limit(1);

        if (!company || company.deletedAt) {
          throw new Error("Company not found");
        }

        await tx
          .update(leads)
          .set({
            status: "DUPLICATE",
            duplicateCompanyId: company.id,
            processedAt: lead.processedAt ?? new Date(),
          })
          .where(eq(leads.id, lead.id));

        return { leadId: lead.id, companyId: company.id };
      });

      revalidatePath("/leads");
      revalidatePath(`/leads/${result.leadId}`);
      revalidateTag("leads", "max");
      revalidateTag(`lead-${result.leadId}`, "max");
      revalidatePath(`/companies/${result.companyId}`);
      revalidateTag("companies", "max");
      revalidateTag(`company-${result.companyId}`, "max");

      return result;
    }),

  /**
   * Clear duplicate linkage from a lead.
   */
  clearDuplicate: protectedProcedure
    .input(z.object({ leadId: z.string() }))
    .mutation(async ({ input }) => {
      const [lead] = await db
        .select({
          id: leads.id,
          status: leads.status,
          duplicateCompanyId: leads.duplicateCompanyId,
          deletedAt: leads.deletedAt,
        })
        .from(leads)
        .where(eq(leads.id, input.leadId))
        .limit(1);

      if (!lead || lead.deletedAt) {
        throw new Error("Lead not found");
      }

      const updatePayload: {
        duplicateCompanyId: null;
        status: "NEW" | "PROCESSED" | "DUPLICATE" | "REJECTED";
        processedAt?: Date | null;
      } = {
        duplicateCompanyId: null,
        status: lead.status === "DUPLICATE" ? "NEW" : lead.status,
      };

      if (lead.status === "DUPLICATE") {
        updatePayload.processedAt = null;
      }

      await db.update(leads).set(updatePayload).where(eq(leads.id, lead.id));

      revalidatePath("/leads");
      revalidatePath(`/leads/${lead.id}`);
      revalidateTag("leads", "max");
      revalidateTag(`lead-${lead.id}`, "max");
      revalidateTag("companies", "max");

      return { leadId: lead.id };
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

        if (lead.status === "DUPLICATE" && lead.duplicateCompanyId) {
          throw new Error(
            "Lead is marked as duplicate. Clear duplicate status before converting.",
          );
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
              duplicateCompanyId: null,
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

      if (result.dealOpportunityId) {
        await upsertDealOpportunityScreening(result.dealOpportunityId);
      }

      return result;
    }),
});
