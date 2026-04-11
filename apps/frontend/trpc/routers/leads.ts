import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import { convertLeadToCompanySchema, leadFormSchema } from "@/lib/schemas";
import { after } from "@/lib/after";
import { revalidatePath, revalidateTag } from "@/lib/cache-invalidation";
import { upsertLeadScreening } from "@repo/deal-screening";
import {
  createDealFinancialSnapshot,
  insertLeadRow,
  deleteLeadDeterministicScreening,
  updateLeadById,
  softDeleteLeadById,
  updateLeadRowById,
  rejectLeadById,
  markLeadDuplicateTx,
  convertLeadToDealOpportunityTx,
} from "@repo/db/mutations";
import {
  searchLeadsForChat,
  getLeadStatusRow,
  getCompanyExistsForLead,
  getLeadForDuplicateCandidates,
  listCompaniesForLeadDuplicateSearch,
  getLeadForClearDuplicate,
} from "@repo/db/queries";
import {
  getBitrixDealStages,
  getDefaultBitrixStageId,
} from "@repo/bitrix-sync";

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

  const leadNormalized = normalizeText(
    lead.normalizedCompanyName || lead.rawTitle,
  );
  const companyNormalized = normalizeText(
    company.normalizedName || company.name,
  );
  const leadTitle = normalizeText(lead.rawTitle);
  const companyName = normalizeText(company.name);

  if (
    leadNormalized &&
    companyNormalized &&
    leadNormalized === companyNormalized
  ) {
    score += 0.75;
    reasons.push("Exact normalized-name match");
  } else {
    if (
      leadNormalized &&
      companyNormalized &&
      (leadNormalized.includes(companyNormalized) ||
        companyNormalized.includes(leadNormalized))
    ) {
      score += 0.35;
      reasons.push("Strong name overlap");
    }

    if (
      leadTitle &&
      companyName &&
      (leadTitle.includes(companyName) || companyName.includes(leadTitle))
    ) {
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
  searchForChat: protectedProcedure
    .input(
      z
        .object({
          query: z.string().trim().optional(),
          limit: z.number().int().min(1).max(50).default(20),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const query = input?.query?.trim();
      const limit = input?.limit ?? 20;
      return searchLeadsForChat({ query, limit });
    }),

  /**
   * Create a new lead
   */
  create: protectedProcedure
    .input(createLeadSchema)
    .mutation(async ({ input }) => {
      const added = await insertLeadRow({
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
      });

      if (added?.id) {
        await upsertLeadScreening(added.id);
      }

      after(async () => {
        revalidatePath("/leads");
        if (added?.id) {
          revalidatePath(`/leads/${added.id}`);
        }
        revalidateTag("leads", "max");
        if (added?.id) {
          revalidateTag(`lead-${added.id}`, "max");
        }
      });
      return { leadId: added?.id };
    }),

  screenLead: protectedProcedure
    .input(z.object({ leadId: z.string() }))
    .mutation(async ({ input }) => {
      const screening = await upsertLeadScreening(input.leadId);
      after(async () => {
        revalidatePath("/leads");
        revalidatePath(`/leads/${input.leadId}`);
        revalidateTag("leads", "max");
        revalidateTag(`lead-${input.leadId}`, "max");
      });
      return { screening };
    }),

  deleteLeadDeterministicScreening: protectedProcedure
    .input(z.object({ leadId: z.string() }))
    .mutation(async ({ input }) => {
      await deleteLeadDeterministicScreening(input.leadId);

      after(async () => {
        revalidatePath("/leads");
        revalidatePath(`/leads/${input.leadId}`);
        revalidateTag("leads", "max");
        revalidateTag(`lead-${input.leadId}`, "max");
      });
      return { success: true };
    }),

  /**
   * Update an existing lead
   */
  update: protectedProcedure
    .input(leadFormSchema.extend({ id: z.string() }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      console.log("input", input);
      console.log("data", data);
      await updateLeadById(id, {
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
      });

      await upsertLeadScreening(id);

      after(async () => {
        revalidatePath("/leads");
        revalidatePath(`/leads/${id}`);
        revalidatePath(`/leads/${id}/edit`);
        revalidateTag("leads", "max");
        revalidateTag(`lead-${id}`, "max");
      });
      return { leadId: id };
    }),

  /**
   * Soft delete a lead
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await softDeleteLeadById(input.id);
      after(async () => {
        revalidatePath("/leads");
        revalidateTag("leads", "max");
        revalidateTag(`lead-${input.id}`, "max");
      });
      return { success: true };
    }),

  /**
   * Explicitly update lead status. User-controlled, predictable.
   */
  updateStatus: protectedProcedure
    .input(
      z.object({
        leadId: z.string(),
        status: z.enum(["NEW", "PROCESSED", "DUPLICATE", "REJECTED"]),
        companyId: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const lead = await getLeadStatusRow(input.leadId);

      if (!lead || lead.deletedAt) {
        throw new Error("Lead not found");
      }

      if (input.status === "DUPLICATE" && !input.companyId) {
        throw new Error("Company is required when setting status to DUPLICATE");
      }

      const now = new Date();
      type Status = "NEW" | "PROCESSED" | "DUPLICATE" | "REJECTED";
      const payload: {
        status: Status;
        duplicateCompanyId: string | null;
        processedAt: Date | null;
      } = {
        status: input.status as Status,
        duplicateCompanyId: null,
        processedAt: lead.processedAt ?? now,
      };

      switch (input.status) {
        case "NEW":
          payload.duplicateCompanyId = null;
          payload.processedAt = null;
          break;
        case "REJECTED":
          payload.duplicateCompanyId = null;
          payload.processedAt = now;
          break;
        case "DUPLICATE":
          if (!input.companyId)
            throw new Error("Company required for DUPLICATE");
          const company = await getCompanyExistsForLead(input.companyId);
          if (!company || company.deletedAt) {
            throw new Error("Company not found");
          }
          payload.duplicateCompanyId = input.companyId;
          payload.processedAt = lead.processedAt ?? now;
          break;
        case "PROCESSED":
          payload.duplicateCompanyId = null;
          payload.processedAt = lead.processedAt ?? now;
          break;
      }

      await updateLeadRowById(lead.id, payload);

      after(async () => {
        revalidatePath("/leads");
        revalidatePath(`/leads/${input.leadId}`);
        revalidateTag("leads", "max");
        revalidateTag(`lead-${input.leadId}`, "max");
        if (payload.duplicateCompanyId) {
          revalidatePath(`/companies/${payload.duplicateCompanyId}`);
          revalidateTag(`company-${payload.duplicateCompanyId}`, "max");
        }
      });
      return { leadId: input.leadId };
    }),

  /**
   * Mark a lead as rejected
   */
  reject: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await rejectLeadById(input.id);

      after(async () => {
        revalidatePath("/leads");
        revalidatePath(`/leads/${input.id}`);
        revalidateTag("leads", "max");
        revalidateTag(`lead-${input.id}`, "max");
      });
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
      const lead = await getLeadForDuplicateCandidates(input.leadId);

      if (!lead || lead.deletedAt) {
        throw new Error("Lead not found");
      }

      const searchTerm = input.query?.trim();
      const companyRows = await listCompaniesForLeadDuplicateSearch({
        searchTerm,
        limit: input.limit,
        wideLimit: Math.max(input.limit, 20),
      });

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
      const result = await markLeadDuplicateTx({
        leadId: input.leadId,
        companyId: input.companyId,
      });

      after(async () => {
        revalidatePath("/leads");
        revalidatePath(`/leads/${result.leadId}`);
        revalidateTag("leads", "max");
        revalidateTag(`lead-${result.leadId}`, "max");
        revalidatePath(`/companies/${result.companyId}`);
        revalidateTag("companies", "max");
        revalidateTag(`company-${result.companyId}`, "max");
      });
      return result;
    }),

  /**
   * Clear duplicate linkage from a lead.
   */
  clearDuplicate: protectedProcedure
    .input(z.object({ leadId: z.string() }))
    .mutation(async ({ input }) => {
      const lead = await getLeadForClearDuplicate(input.leadId);

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

      await updateLeadRowById(lead.id, updatePayload);

      after(async () => {
        revalidatePath("/leads");
        revalidatePath(`/leads/${lead.id}`);
        revalidateTag("leads", "max");
        revalidateTag(`lead-${lead.id}`, "max");
        revalidateTag("companies", "max");
      });
      return { leadId: lead.id };
    }),

  /**
   * Convert a lead into a deal opportunity (company optional and attachable later)
   */
  convertToCompany: protectedProcedure
    .input(convertLeadToCompanySchema)
    .mutation(async ({ input }) => {
      const leadId = input.id;
      const defaultStage = getDefaultBitrixStageId(getBitrixDealStages());
      const result = await convertLeadToDealOpportunityTx({
        leadId,
        defaultStage,
      });

      after(async () => {
        revalidatePath("/leads");
        revalidatePath("/deal-opportunities");
        if (result.dealOpportunityId) {
          revalidatePath(`/deal-opportunities/${result.dealOpportunityId}`);
          revalidateTag(`deal-${result.dealOpportunityId}`, "max");
        }
        revalidateTag("leads", "max");
        revalidateTag(`lead-${result.leadId}`, "max");
        revalidateTag("deals", "max");
      });

      if (result.dealOpportunityId) {
        if (
          result.createdOpportunityFromLead &&
          (result.leadRevenue != null ||
            result.leadEbitda != null ||
            result.leadAskingPrice != null)
        ) {
          await createDealFinancialSnapshot({
            dealOpportunityId: result.dealOpportunityId,
            revenue: result.leadRevenue,
            ebitda: result.leadEbitda,
            askingPrice: result.leadAskingPrice,
            source: "LISTING",
          });
        }
      }

      return result;
    }),
});
