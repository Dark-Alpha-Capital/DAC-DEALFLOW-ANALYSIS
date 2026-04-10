import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
  adminProcedure,
} from "../init";
import {
  addFinancialSnapshotSchema,
  addRiskFlagSchema,
  adminDeleteDealInputSchema,
  bitrixSyncDealOpportunitySchema,
  bitrixSyncScreeningRunToDealSchema,
  bulkDeleteDealsInputSchema,
  createDealOpportunitySchema,
  createDealSchema,
  createOpportunityQuickSchema,
  dealOpportunityIdInputSchema,
  dealOpportunityIdMinInputSchema,
  deleteOpportunityInputSchema,
  editFinancialsSchema,
  screenOpportunitySchema,
  searchForChatInputSchema,
  startTemplateScreeningInputSchema,
  updateDealSchema,
  updateOpportunityStageSchema,
  updateSpecificationsSchema,
  updateTagsSchema,
  uploadCIMSchema,
  uploadDealDocumentSchema,
} from "@/lib/zod-schemas/deals-router";
import db, {
  deals,
  dealOpportunities,
  dealOpportunityThemes,
  dealOpportunityCompanyLinks,
  dealOpportunityScreenings,
  aiScreenings,
  companies,
  themes,
  investorDealOpportunityLinks,
  investors,
  leads,
  eq,
  and,
  or,
  isNull,
  ilike,
  desc,
  DealType,
  documents,
  DealDocumentCategory,
  DocumentCategory,
  ReviewState,
} from "@repo/db";
import { DeleteDealById, BulkDeleteDeals } from "@repo/db/mutations";
import { after } from "@/lib/after";
import { revalidatePath, revalidateTag } from "@/lib/cache-invalidation";
import type { FileUploadJobData, EntityMetadata } from "@repo/redis-queue/types";
import {
  insertWorkflowJob,
  startCimExtractionWorkflow,
  startFileUploadWorkflow,
  startRagIngestionWorkflow,
  startSimScreeningWorkflow,
} from "@/src/lib/workflow-jobs-api";
import { setWorkflowJobState } from "@repo/db/workflow-jobs";
import { createHash, randomUUID } from "crypto";
import {
  GetDealById,
  GetDealOpportunityById,
  GetDealOpportunityByLegacyDealId,
  GetCIMExtractionByDealOpportunityId,
  getActiveSimForDeal,
  GetLatestDealFinancialSnapshotByDealOpportunityId,
  GetDealFinancialSnapshotsByDealOpportunityId,
  GetDealRiskFlagsByDealOpportunityId,
  countDocumentChunksByDealOpportunityId,
  getScreenerById,
  getSimScreeningRunByIdForUser,
  getSimScreeningSessionByIdForUser,
} from "@repo/db/queries";
import {
  replaceDealSim,
  upsertCIMExtraction,
  deleteFinancialsForSim,
  createDealFinancialSnapshot,
  createDealRiskFlag,
  insertSimScreeningSession,
  insertSimScreeningRun,
} from "@repo/db/mutations";
import { buildNextcloudFileUrl, uploadBuffer } from "@repo/nextcloud";
import { TRPCError } from "@trpc/server";
import { QUEUE_NAMES } from "@repo/redis-queue/types";
import {
  upsertDealOpportunityScreening,
  runAiQualitativeScreening,
} from "@repo/deal-screening";
import {
  buildBitrixDealDetailUrl,
  buildCrmDealFieldsFromOpportunitySync,
  callBitrix,
  getAiBitrixFormFieldMeta,
  getBitrixDealFieldsCatalog,
  getBitrixDealStages,
  getBitrixDealTeaserFieldCode,
  getBitrixSyncEnv,
  inferPortalBaseFromWebhook,
} from "@repo/bitrix-sync";
import { getBitrixSyncPreviewData } from "@/lib/server/bitrix-sync-preview-data";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const formatUsd = (value: number) => currencyFormatter.format(value);

function isUniqueViolationError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}

export const dealsRouter = createTRPCRouter({
  searchForChat: protectedProcedure
    .input(searchForChatInputSchema)
    .query(async ({ input }) => {
      const query = input?.query?.trim();
      const limit = input?.limit ?? 20;
      const predicates = [isNull(companies.deletedAt)];

      if (query) {
        const searchTerm = `%${query}%`;
        predicates.push(
          or(
            ilike(companies.name, searchTerm),
            ilike(dealOpportunities.dealTeaser, searchTerm),
            ilike(dealOpportunities.sourceWebsite, searchTerm),
            ilike(dealOpportunities.brokerage, searchTerm),
          )!,
        );
      }

      return db
        .select({
          id: dealOpportunities.id,
          companyId: dealOpportunities.companyId,
          leadId: dealOpportunities.leadId,
          dealTeaser: dealOpportunities.dealTeaser,
          stage: dealOpportunities.stage,
          status: dealOpportunities.status,
          companyName: companies.name,
          sourceWebsite: dealOpportunities.sourceWebsite,
        })
        .from(dealOpportunities)
        .leftJoin(companies, eq(dealOpportunities.companyId, companies.id))
        .where(and(...predicates))
        .orderBy(desc(dealOpportunities.updatedAt), desc(dealOpportunities.id))
        .limit(limit);
    }),

  uploadCIM: protectedProcedure
    .input(uploadCIMSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;
      if (!userId?.trim()) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User ID is required",
        });
      }

      const opp = await GetDealOpportunityById(input.dealOpportunityId);
      if (!opp) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Deal opportunity not found",
        });
      }

      if (!input.fileName.toLowerCase().endsWith(".pdf")) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "CIM must be a PDF file",
        });
      }

      const base64Data = input.fileData.split(",")[1] || input.fileData;
      const buffer = Buffer.from(base64Data, "base64");
      const contentHash = createHash("sha256").update(buffer).digest("hex");

      const [existingDealDocument] = await db
        .select({ id: documents.id })
        .from(documents)
        .where(
          and(
            eq(documents.dealOpportunityId, input.dealOpportunityId),
            eq(documents.contentHash, contentHash),
          ),
        )
        .limit(1);

      if (existingDealDocument) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This document was already uploaded for this deal",
        });
      }
      const finalPath = `dealflow/deal_opportunity/${input.dealOpportunityId}/cim/${input.fileName}`;

      await uploadBuffer(buffer, finalPath);

      const publicUrl = buildNextcloudFileUrl(finalPath);

      let documentRecord:
        | {
          id: string;
        }
        | undefined;
      try {
        [documentRecord] = await db
          .insert(documents)
          .values({
            entityType: "DEAL_OPPORTUNITY",
            entityId: input.dealOpportunityId,
            dealOpportunityId: input.dealOpportunityId,
            title: input.title,
            description: input.description?.trim()
              ? input.description.trim()
              : null,
            category: input.category,
            fileUrl: publicUrl,
            fileName: input.fileName,
            fileSize: buffer.length,
            mimeType: "application/pdf",
            contentHash,
            uploadedById: userId,
          })
          .returning({ id: documents.id });
      } catch (error) {
        if (isUniqueViolationError(error)) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "This document was already uploaded for this deal",
          });
        }
        throw error;
      }

      if (!documentRecord) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to save document record",
        });
      }

      const sim = await replaceDealSim({
        dealOpportunityId: input.dealOpportunityId,
        documentId: documentRecord.id,
        storageKey: finalPath,
        uploadedById: userId,
      });

      const ragJobId = randomUUID();
      await insertWorkflowJob({
        instanceId: ragJobId,
        workflowKind: "rag-ingestion",
        userId,
        dealId: input.dealOpportunityId,
        fileName: input.fileName,
      });
      try {
        await startRagIngestionWorkflow(ragJobId, {
          documentId: documentRecord.id,
          userId,
        });
      } catch (error) {
        await setWorkflowJobState(ragJobId, "failed", {
          failedReason:
            error instanceof Error ? error.message : "Failed to start workflow",
        });
        throw error;
      }

      const jobId = randomUUID();
      await insertWorkflowJob({
        instanceId: jobId,
        workflowKind: "cim-extraction",
        userId,
        dealId: input.dealOpportunityId,
        fileName: input.fileName,
      });
      await startCimExtractionWorkflow(jobId, {
        simId: sim.id,
        documentId: documentRecord.id,
        dealOpportunityId: input.dealOpportunityId,
        filePath: finalPath,
        userId,
      });

      after(async () => {
        revalidateTag(`deal-${input.dealOpportunityId}`, "max");
        revalidateTag("deals", "max");
        revalidatePath(`/deal-opportunities/${input.dealOpportunityId}`);
      });
      return {
        success: true,
        jobId,
        documentId: documentRecord.id,
        simId: sim.id,
      };
    }),

  getActiveSimForOpportunity: protectedProcedure
    .input(dealOpportunityIdInputSchema)
    .query(async ({ input }) => {
      const sim = await getActiveSimForDeal(input.dealOpportunityId);
      if (!sim) return null;
      const [doc] = await db
        .select({
          fileName: documents.fileName,
          createdAt: documents.createdAt,
        })
        .from(documents)
        .where(eq(documents.id, sim.documentId))
        .limit(1);
      return {
        id: sim.id,
        documentId: sim.documentId,
        fileName: doc?.fileName ?? null,
        uploadedAt: sim.uploadedAt,
        status: sim.status,
      };
    }),

  getCIMAnalysisForOpportunity: protectedProcedure
    .input(dealOpportunityIdInputSchema)
    .query(async ({ input }) => {
      const activeSim = await getActiveSimForDeal(input.dealOpportunityId);
      const extraction = await GetCIMExtractionByDealOpportunityId(
        input.dealOpportunityId,
      );
      const hasActiveSim = !!activeSim;
      const hasFinancials = !!extraction;
      return {
        activeSim: activeSim
          ? {
            id: activeSim.id,
            status: hasFinancials
              ? ("ready" as const)
              : ("processing" as const),
          }
          : null,
        revenueHistory: extraction?.revenueHistory ?? {},
        ebitdaHistory: extraction?.ebitdaHistory ?? {},
        employeeCount: extraction?.employeeCount,
        customerConcentration: extraction?.customerConcentration,
        capexIntensity: extraction?.capexIntensity,
        revenueBreakdown: extraction?.revenueBreakdown ?? {},
        growthDrivers: extraction?.growthDrivers ?? [],
        keyRisks: extraction?.keyRisks ?? [],
        industryOverview: extraction?.industryOverview,
        transactionDetails: extraction?.transactionDetails,
        documentFileName: extraction?.documentFileName,
        documentCreatedAt: extraction?.documentCreatedAt,
      };
    }),

  editFinancials: protectedProcedure
    .input(editFinancialsSchema)
    .mutation(async ({ input, ctx }) => {
      const sim = await getActiveSimForDeal(input.dealOpportunityId);
      if (!sim) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No active SIM found for this deal",
        });
      }
      const existing = await GetCIMExtractionByDealOpportunityId(
        input.dealOpportunityId,
      );
      const payload = {
        revenueHistory:
          input.revenueHistory ?? existing?.revenueHistory ?? null,
        ebitdaHistory: input.ebitdaHistory ?? existing?.ebitdaHistory ?? null,
        employeeCount: input.employeeCount ?? existing?.employeeCount ?? null,
        customerConcentration:
          input.customerConcentration ??
          existing?.customerConcentration ??
          null,
        capexIntensity:
          input.capexIntensity ?? existing?.capexIntensity ?? null,
        revenueBreakdown:
          input.revenueBreakdown ?? existing?.revenueBreakdown ?? null,
        growthDrivers: input.growthDrivers ?? existing?.growthDrivers ?? null,
        keyRisks: input.keyRisks ?? existing?.keyRisks ?? null,
        industryOverview:
          input.industryOverview ?? existing?.industryOverview ?? null,
        transactionDetails:
          input.transactionDetails ?? existing?.transactionDetails ?? null,
      };
      await upsertCIMExtraction({
        simId: sim.id,
        dealOpportunityId: input.dealOpportunityId,
        payload,
        source: "USER",
        updatedByUserId: ctx.session.user.id,
      });
      after(async () => {
        revalidateTag(`deal-${input.dealOpportunityId}`, "max");
        revalidatePath(`/deal-opportunities/${input.dealOpportunityId}`);
      });
      return { success: true };
    }),

  deleteFinancials: protectedProcedure
    .input(dealOpportunityIdInputSchema)
    .mutation(async ({ input }) => {
      const sim = await getActiveSimForDeal(input.dealOpportunityId);
      if (!sim) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No active SIM found for this deal",
        });
      }
      await deleteFinancialsForSim(sim.id);
      after(async () => {
        revalidateTag(`deal-${input.dealOpportunityId}`, "max");
        revalidatePath(`/deal-opportunities/${input.dealOpportunityId}`);
      });
      return { success: true, canReExtract: true };
    }),

  create: protectedProcedure
    .input(createDealSchema)
    .mutation(async ({ input, ctx }) => {
      const [addedDeal] = await db
        .insert(deals)
        .values({
          title: input.title,
          dealCaption: input.deal_caption,
          firstName: input.first_name,
          lastName: input.last_name,
          email: input.email,
          linkedinUrl: input.linkedinurl,
          workPhone: input.work_phone,
          revenue: input.revenue,
          ebitda: input.ebitda,
          ebitdaMargin: input.ebitda_margin,
          grossRevenue: input.gross_revenue,
          companyLocation: input.company_location,
          brokerage: input.brokerage,
          sourceWebsite: input.source_website || "",
          industry: input.industry,
          askingPrice: input.asking_price,
          dealType: DealType.MANUAL,
          userId: ctx.user.id,
        })
        .returning();

      after(async () => {
        revalidatePath("/manual-deals");
        revalidateTag("deals", "max");
      });
      return { dealId: addedDeal?.id };
    }),

  createOpportunity: protectedProcedure
    .input(createDealOpportunitySchema)
    .mutation(async ({ input, ctx }) => {
      const hasFinancials =
        input.revenue != null ||
        input.ebitda != null ||
        input.ebitdaMargin != null ||
        input.askingPrice != null;

      const [added] = await db
        .insert(dealOpportunities)
        .values({
          companyId: input.companyId ?? null,
          leadId: input.leadId || null,
          sourceWebsite: input.sourceWebsite || null,
          brokerage: input.brokerage || null,
          revenue: null,
          ebitda: null,
          ebitdaMargin: null,
          askingPrice: null,
          dealTeaser: input.dealTeaser || null,
          description: input.description || null,
          brokerFirstName: input.brokerFirstName || null,
          brokerLastName: input.brokerLastName || null,
          brokerEmail: input.brokerEmail || null,
          brokerPhone: input.brokerPhone || null,
          brokerLinkedIn: input.brokerLinkedIn || null,
          userId: ctx.user.id,
        })
        .returning();

      if (added?.id) {
        if (hasFinancials) {
          await createDealFinancialSnapshot({
            dealOpportunityId: added.id,
            revenue: input.revenue ?? null,
            ebitda: input.ebitda ?? null,
            ebitdaMargin: input.ebitdaMargin ?? null,
            askingPrice: input.askingPrice ?? null,
            source: "LISTING",
            createdById: ctx.user.id,
          });
        }
        await upsertDealOpportunityScreening(added.id);
      }

      after(async () => {
        revalidatePath("/deal-opportunities");
        revalidateTag("deals", "max");
      });
      return { dealOpportunityId: added?.id };
    }),

  listCompanyLinks: protectedProcedure
    .input(z.object({ dealOpportunityId: z.string() }))
    .query(async ({ input }) => {
      return db
        .select({
          link: dealOpportunityCompanyLinks,
          company: {
            id: companies.id,
            name: companies.name,
            industry: companies.industry,
            location: companies.location,
          },
        })
        .from(dealOpportunityCompanyLinks)
        .innerJoin(
          companies,
          eq(dealOpportunityCompanyLinks.companyId, companies.id),
        )
        .where(
          and(
            eq(
              dealOpportunityCompanyLinks.dealOpportunityId,
              input.dealOpportunityId,
            ),
            isNull(companies.deletedAt),
          ),
        )
        .orderBy(desc(dealOpportunityCompanyLinks.createdAt));
    }),

  addCompanyLink: protectedProcedure
    .input(
      z.object({
        dealOpportunityId: z.string(),
        companyId: z.string(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const [opp] = await db
        .select({ id: dealOpportunities.id, companyId: dealOpportunities.companyId })
        .from(dealOpportunities)
        .where(eq(dealOpportunities.id, input.dealOpportunityId))
        .limit(1);
      if (!opp) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Deal opportunity not found" });
      }

      const [company] = await db
        .select({ id: companies.id })
        .from(companies)
        .where(and(eq(companies.id, input.companyId), isNull(companies.deletedAt)))
        .limit(1);
      if (!company) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Company not found" });
      }

      const [dup] = await db
        .select({ id: dealOpportunityCompanyLinks.id })
        .from(dealOpportunityCompanyLinks)
        .where(
          and(
            eq(dealOpportunityCompanyLinks.dealOpportunityId, input.dealOpportunityId),
            eq(dealOpportunityCompanyLinks.companyId, input.companyId),
          ),
        )
        .limit(1);
      if (dup) {
        throw new TRPCError({ code: "CONFLICT", message: "Company already linked to this deal" });
      }

      await db.insert(dealOpportunityCompanyLinks).values({
        dealOpportunityId: input.dealOpportunityId,
        companyId: input.companyId,
        notes: input.notes?.trim() || null,
      });

      // Keep legacy single-company field aligned for compatibility.
      if (!opp.companyId) {
        await db
          .update(dealOpportunities)
          .set({ companyId: input.companyId })
          .where(eq(dealOpportunities.id, input.dealOpportunityId));
      }

      after(async () => {
        revalidatePath(`/deal-opportunities/${input.dealOpportunityId}`);
        revalidatePath(`/companies/${input.companyId}`);
        revalidateTag(`deal-${input.dealOpportunityId}`, "max");
        revalidateTag(`company-${input.companyId}`, "max");
        revalidateTag("deals", "max");
        revalidateTag("companies", "max");
      });
      return { success: true };
    }),

  removeCompanyLink: protectedProcedure
    .input(z.object({ linkId: z.string() }))
    .mutation(async ({ input }) => {
      const [removed] = await db
        .delete(dealOpportunityCompanyLinks)
        .where(eq(dealOpportunityCompanyLinks.id, input.linkId))
        .returning();
      if (!removed) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Link not found" });
      }

      const [opp] = await db
        .select({ id: dealOpportunities.id, companyId: dealOpportunities.companyId })
        .from(dealOpportunities)
        .where(eq(dealOpportunities.id, removed.dealOpportunityId))
        .limit(1);

      if (opp && opp.companyId === removed.companyId) {
        const [fallback] = await db
          .select({ companyId: dealOpportunityCompanyLinks.companyId })
          .from(dealOpportunityCompanyLinks)
          .where(eq(dealOpportunityCompanyLinks.dealOpportunityId, removed.dealOpportunityId))
          .orderBy(desc(dealOpportunityCompanyLinks.createdAt))
          .limit(1);
        await db
          .update(dealOpportunities)
          .set({ companyId: fallback?.companyId ?? null })
          .where(eq(dealOpportunities.id, removed.dealOpportunityId));
      }

      after(async () => {
        revalidatePath(`/deal-opportunities/${removed.dealOpportunityId}`);
        revalidatePath(`/companies/${removed.companyId}`);
        revalidateTag(`deal-${removed.dealOpportunityId}`, "max");
        revalidateTag(`company-${removed.companyId}`, "max");
        revalidateTag("deals", "max");
        revalidateTag("companies", "max");
      });
      return { success: true };
    }),

  listInvestorLinks: protectedProcedure
    .input(z.object({ dealOpportunityId: z.string() }))
    .query(async ({ input }) => {
      return db
        .select({
          link: investorDealOpportunityLinks,
          investor: {
            id: investors.id,
            name: investors.name,
            type: investors.type,
            status: investors.status,
          },
        })
        .from(investorDealOpportunityLinks)
        .innerJoin(
          investors,
          eq(investorDealOpportunityLinks.investorId, investors.id),
        )
        .where(eq(investorDealOpportunityLinks.dealOpportunityId, input.dealOpportunityId))
        .orderBy(desc(investorDealOpportunityLinks.createdAt));
    }),

  addInvestorLink: protectedProcedure
    .input(
      z.object({
        dealOpportunityId: z.string(),
        investorId: z.string(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const [opp] = await db
        .select({ id: dealOpportunities.id })
        .from(dealOpportunities)
        .where(eq(dealOpportunities.id, input.dealOpportunityId))
        .limit(1);
      if (!opp) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Deal opportunity not found" });
      }

      const [investor] = await db
        .select({ id: investors.id })
        .from(investors)
        .where(eq(investors.id, input.investorId))
        .limit(1);
      if (!investor) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Investor not found" });
      }

      const [dup] = await db
        .select({ id: investorDealOpportunityLinks.id })
        .from(investorDealOpportunityLinks)
        .where(
          and(
            eq(investorDealOpportunityLinks.dealOpportunityId, input.dealOpportunityId),
            eq(investorDealOpportunityLinks.investorId, input.investorId),
          ),
        )
        .limit(1);
      if (dup) {
        throw new TRPCError({ code: "CONFLICT", message: "Investor already linked to this deal" });
      }

      await db.insert(investorDealOpportunityLinks).values({
        dealOpportunityId: input.dealOpportunityId,
        investorId: input.investorId,
        notes: input.notes?.trim() || null,
      });

      after(async () => {
        revalidatePath(`/deal-opportunities/${input.dealOpportunityId}`);
        revalidatePath(`/investors/${input.investorId}`);
        revalidateTag(`deal-${input.dealOpportunityId}`, "max");
        revalidateTag(`investor-${input.investorId}`, "max");
        revalidateTag("deals", "max");
        revalidateTag("investors", "max");
      });
      return { success: true };
    }),

  removeInvestorLink: protectedProcedure
    .input(z.object({ linkId: z.string() }))
    .mutation(async ({ input }) => {
      const [removed] = await db
        .delete(investorDealOpportunityLinks)
        .where(eq(investorDealOpportunityLinks.id, input.linkId))
        .returning();
      if (!removed) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Link not found" });
      }

      after(async () => {
        revalidatePath(`/deal-opportunities/${removed.dealOpportunityId}`);
        revalidatePath(`/investors/${removed.investorId}`);
        revalidateTag(`deal-${removed.dealOpportunityId}`, "max");
        revalidateTag(`investor-${removed.investorId}`, "max");
        revalidateTag("deals", "max");
        revalidateTag("investors", "max");
      });
      return { success: true };
    }),

  createOpportunityQuick: protectedProcedure
    .input(createOpportunityQuickSchema)
    .mutation(async ({ input, ctx }) => {
      const hasFinancials =
        input.revenue != null ||
        input.ebitda != null ||
        input.ebitdaMargin != null ||
        input.askingPrice != null;

      const result = await db.transaction(async (tx) => {
        const normalizedThemeId = input.themeId?.trim() || null;
        if (normalizedThemeId) {
          const [theme] = await tx
            .select({ id: themes.id })
            .from(themes)
            .where(and(eq(themes.id, normalizedThemeId), isNull(themes.deletedAt)))
            .limit(1);
          if (!theme) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Selected theme does not exist",
            });
          }
        }

        const [opp] = await tx
          .insert(dealOpportunities)
          .values({
            companyId: null,
            leadId: null,
            sourceWebsite: input.sourceWebsite || null,
            brokerage: input.brokerage || null,
            revenue: null,
            ebitda: null,
            ebitdaMargin: null,
            askingPrice: null,
            dealTeaser: input.dealTeaser || null,
            description: input.description || null,
            brokerFirstName: input.brokerFirstName || null,
            brokerLastName: input.brokerLastName || null,
            brokerEmail: input.brokerEmail || null,
            brokerPhone: input.brokerPhone || null,
            brokerLinkedIn: input.brokerLinkedIn || null,
            userId: ctx.user.id,
          })
          .returning();

        if (!opp) throw new Error("Failed to create deal opportunity");

        if (normalizedThemeId) {
          await tx.insert(dealOpportunityThemes).values({
            dealOpportunityId: opp.id,
            themeId: normalizedThemeId,
            isPrimary: true,
          });
        }

        return { opp };
      });

      if (hasFinancials) {
        await createDealFinancialSnapshot({
          dealOpportunityId: result.opp.id,
          revenue: input.revenue ?? null,
          ebitda: input.ebitda ?? null,
          ebitdaMargin: input.ebitdaMargin ?? null,
          askingPrice: input.askingPrice ?? null,
          source: "LISTING",
          createdById: ctx.user.id,
        });
      }
      await upsertDealOpportunityScreening(result.opp.id);

      after(async () => {
        revalidatePath("/deal-opportunities");
        revalidatePath(`/deal-opportunities/${result.opp.id}`);
        revalidateTag("deals", "max");
      });
      return {
        dealOpportunityId: result.opp.id,
      };
    }),

  updateOpportunityStage: protectedProcedure
    .input(updateOpportunityStageSchema)
    .mutation(async ({ input }) => {
      await db
        .update(dealOpportunities)
        .set({ stage: input.stage })
        .where(eq(dealOpportunities.id, input.id));

      after(async () => {
        revalidatePath("/deal-opportunities");
        revalidateTag("deals", "max");
        revalidateTag(`deal-${input.id}`, "max");
      });
      return { dealOpportunityId: input.id, stage: input.stage };
    }),

  addFinancialSnapshot: protectedProcedure
    .input(addFinancialSnapshotSchema)
    .mutation(async ({ input, ctx }) => {
      const snapshot = await createDealFinancialSnapshot({
        dealOpportunityId: input.dealOpportunityId,
        revenue: input.revenue ?? null,
        ebitda: input.ebitda ?? null,
        ebitdaMargin: input.ebitdaMargin ?? null,
        askingPrice: input.askingPrice ?? null,
        impliedMultiple: input.impliedMultiple ?? null,
        source: input.source,
        notes: input.notes ?? null,
        createdById: ctx.user.id,
      });

      await upsertDealOpportunityScreening(input.dealOpportunityId);

      after(async () => {
        revalidatePath("/deal-opportunities");
        revalidatePath(`/deal-opportunities/${input.dealOpportunityId}`);
        revalidateTag("deals", "max");
        revalidateTag(`deal-${input.dealOpportunityId}`, "max");
      });
      return { snapshot };
    }),

  listFinancialSnapshots: protectedProcedure
    .input(dealOpportunityIdMinInputSchema)
    .query(async ({ input }) =>
      GetDealFinancialSnapshotsByDealOpportunityId(input.dealOpportunityId),
    ),

  addRiskFlag: protectedProcedure
    .input(addRiskFlagSchema)
    .mutation(async ({ input, ctx }) => {
      const riskFlag = await createDealRiskFlag({
        dealOpportunityId: input.dealOpportunityId,
        riskType: input.riskType,
        severity: input.severity,
        description: input.description,
        source: "USER",
        createdById: ctx.user.id,
      });

      after(async () => {
        revalidatePath(`/deal-opportunities/${input.dealOpportunityId}`);
        revalidateTag(`deal-${input.dealOpportunityId}`, "max");
      });
      return { riskFlag };
    }),

  listRiskFlags: protectedProcedure
    .input(dealOpportunityIdMinInputSchema)
    .query(async ({ input }) =>
      GetDealRiskFlagsByDealOpportunityId(input.dealOpportunityId),
    ),

  screenOpportunity: protectedProcedure
    .input(screenOpportunitySchema)
    .mutation(async ({ input }) => {
      const screening = await upsertDealOpportunityScreening(input.id);

      after(async () => {
        revalidatePath("/deal-opportunities");
        revalidatePath(`/deal-opportunities/${input.id}`);
        revalidatePath("/dashboard");
        revalidateTag("deals", "max");
        revalidateTag(`deal-${input.id}`, "max");
      });
      return { screening };
    }),

  deleteDeterministicScreening: protectedProcedure
    .input(dealOpportunityIdInputSchema)
    .mutation(async ({ input }) => {
      await db
        .delete(dealOpportunityScreenings)
        .where(
          eq(
            dealOpportunityScreenings.dealOpportunityId,
            input.dealOpportunityId,
          ),
        );

      after(async () => {
        revalidatePath("/deal-opportunities");
        revalidatePath(`/deal-opportunities/${input.dealOpportunityId}`);
        revalidateTag("deals", "max");
        revalidateTag(`deal-${input.dealOpportunityId}`, "max");
      });
      return { success: true };
    }),

  runAiScreening: protectedProcedure
    .input(dealOpportunityIdInputSchema)
    .mutation(async ({ input }) => {
      let opp = await GetDealOpportunityById(input.dealOpportunityId);
      if (!opp) {
        opp = await GetDealOpportunityByLegacyDealId(input.dealOpportunityId);
      }
      if (!opp) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Deal opportunity not found",
        });
      }

      const companyPromise = opp.companyId
        ? db
          .select()
          .from(companies)
          .where(
            and(
              eq(companies.id, opp.companyId),
              isNull(companies.deletedAt),
            ),
          )
          .limit(1)
          .then((r) => r[0] ?? null)
        : Promise.resolve(null);

      const [company, leadFromOpp, latestSnapshot] = await Promise.all([
        companyPromise,
        opp.leadId
          ? db.select().from(leads).where(eq(leads.id, opp.leadId)).limit(1)
          : Promise.resolve([]),
        GetLatestDealFinancialSnapshotByDealOpportunityId(opp.id),
      ]);

      const leadId = opp.leadId ?? company?.firstSeenFromLeadId ?? null;
      const leadRow =
        leadFromOpp[0] ??
        (leadId
          ? ((
            await db.select().from(leads).where(eq(leads.id, leadId)).limit(1)
          )[0] ?? null)
          : null);

      const sections: string[] = [];

      if (opp.dealTeaser || opp.description) {
        sections.push(
          "## Deal Listing\n" +
          [opp.dealTeaser, opp.description].filter(Boolean).join("\n\n"),
        );
      }

      const oppFields: string[] = [];
      const resolvedRevenue = latestSnapshot?.revenue ?? opp.revenue;
      const resolvedEbitda = latestSnapshot?.ebitda ?? opp.ebitda;
      const resolvedEbitdaMargin =
        latestSnapshot?.ebitdaMargin ?? opp.ebitdaMargin;
      const resolvedAskingPrice =
        latestSnapshot?.askingPrice ?? opp.askingPrice;

      if (resolvedRevenue != null)
        oppFields.push(`Revenue: ${formatUsd(resolvedRevenue)}`);
      if (resolvedEbitda != null)
        oppFields.push(`EBITDA: ${formatUsd(resolvedEbitda)}`);
      if (resolvedEbitdaMargin != null)
        oppFields.push(`EBITDA Margin: ${resolvedEbitdaMargin}%`);
      if (resolvedAskingPrice != null)
        oppFields.push(`Asking Price: ${formatUsd(resolvedAskingPrice)}`);
      if (latestSnapshot)
        oppFields.push(`Financial Source: ${latestSnapshot.source}`);
      if (opp.brokerage) oppFields.push(`Brokerage: ${opp.brokerage}`);
      if (opp.sourceWebsite) oppFields.push(`Source: ${opp.sourceWebsite}`);
      if (opp.tags?.length) oppFields.push(`Tags: ${opp.tags.join(", ")}`);
      if (opp.brokerFirstName || opp.brokerLastName) {
        oppFields.push(
          `Broker: ${[opp.brokerFirstName, opp.brokerLastName].filter(Boolean).join(" ")}`,
        );
      }
      if (oppFields.length) {
        sections.push("## Deal Opportunity\n" + oppFields.join("\n"));
      }

      if (company) {
        const companyFields: string[] = [];
        if (company.name) companyFields.push(`Name: ${company.name}`);
        if (company.industry)
          companyFields.push(`Industry: ${company.industry}`);
        if (company.location)
          companyFields.push(`Location: ${company.location}`);
        if (company.revenueEstimate != null)
          companyFields.push(
            `Revenue Estimate: ${formatUsd(company.revenueEstimate)}`,
          );
        if (company.ebitdaEstimate != null)
          companyFields.push(
            `EBITDA Estimate: ${formatUsd(company.ebitdaEstimate)}`,
          );
        if (company.ebitdaMarginEstimate != null)
          companyFields.push(`EBITDA Margin: ${company.ebitdaMarginEstimate}%`);
        if (company.recurringRevenuePct != null)
          companyFields.push(
            `Recurring Revenue: ${company.recurringRevenuePct}%`,
          );
        if (company.customerConcentrationPct != null)
          companyFields.push(
            `Customer Concentration: ${company.customerConcentrationPct}%`,
          );
        if (company.attractivenessScore != null)
          companyFields.push(
            `Attractiveness Score: ${company.attractivenessScore}`,
          );
        if (companyFields.length) {
          sections.push("## Company\n" + companyFields.join("\n"));
        }
      }

      if (leadRow) {
        const leadFields: string[] = [];
        if (leadRow.rawTitle) leadFields.push(`Title: ${leadRow.rawTitle}`);
        if (leadRow.rawDescription)
          leadFields.push(`Description: ${leadRow.rawDescription}`);
        if (leadRow.rawIndustry)
          leadFields.push(`Industry: ${leadRow.rawIndustry}`);
        if (leadRow.revenue != null)
          leadFields.push(`Revenue: ${formatUsd(leadRow.revenue)}`);
        if (leadRow.ebitda != null)
          leadFields.push(`EBITDA: ${formatUsd(leadRow.ebitda)}`);
        if (leadRow.askingPrice != null)
          leadFields.push(`Asking Price: ${formatUsd(leadRow.askingPrice)}`);
        if (leadRow.brokerage)
          leadFields.push(`Brokerage: ${leadRow.brokerage}`);
        if (leadRow.companyLocation)
          leadFields.push(`Location: ${leadRow.companyLocation}`);
        if (leadFields.length) {
          sections.push(
            "## Raw Lead / Source Listing\n" + leadFields.join("\n"),
          );
        }
      }

      const enrichedContext = sections.join("\n\n");
      if (!enrichedContext.trim()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Deal has no description, teaser, or related data to analyze",
        });
      }

      console.log("enrichedContext", enrichedContext);

      const result = await runAiQualitativeScreening(enrichedContext);

      const avg =
        (result.revenuePredictability +
          result.marketGrowth +
          result.competitiveAdvantage +
          result.keyRisks) /
        4;
      const score = Math.round(avg * 20);
      const sentiment =
        avg > 3.5 ? "POSITIVE" : avg < 2.5 ? "NEGATIVE" : "NEUTRAL";

      const content = JSON.stringify({
        revenuePredictability: result.revenuePredictability,
        marketGrowth: result.marketGrowth,
        competitiveAdvantage: result.competitiveAdvantage,
        keyRisks: result.keyRisks,
      });

      await db.insert(aiScreenings).values({
        dealOpportunityId: opp.id,
        title: "Qualitative Analysis",
        explanation: result.explanation,
        score,
        content,
        sentiment: sentiment as "POSITIVE" | "NEGATIVE" | "NEUTRAL",
        screenerId: null,
      });

      after(async () => {
        revalidatePath("/deal-opportunities");
        revalidatePath(`/deal-opportunities/${opp.id}`);
        revalidateTag("deals", "max");
        revalidateTag(`deal-${opp.id}`, "max");
      });
      return { success: true };
    }),

  startTemplateScreening: protectedProcedure
    .input(startTemplateScreeningInputSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;
      if (!userId?.trim()) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User ID required",
        });
      }

      let opp = await GetDealOpportunityById(input.dealOpportunityId);
      if (!opp) {
        opp = await GetDealOpportunityByLegacyDealId(input.dealOpportunityId);
      }
      if (!opp) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Deal opportunity not found",
        });
      }

      const chunkCount = await countDocumentChunksByDealOpportunityId(opp.id);
      if (chunkCount === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "No ingested document chunks for this deal. Upload files and wait for processing, then run template screening.",
        });
      }

      const screener = await getScreenerById(input.screenerId);
      if (!screener) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Screener template not found",
        });
      }

      const session = await insertSimScreeningSession({
        userId,
        dealOpportunityId: opp.id,
      });
      if (!session) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create screening session",
        });
      }

      const jobId = randomUUID();
      const run = await insertSimScreeningRun({
        sessionId: session.id,
        screenerId: input.screenerId,
        workflowInstanceId: jobId,
      });
      if (!run) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create screening run",
        });
      }

      const teaser = opp.dealTeaser?.trim();
      const fileLabel =
        teaser && teaser.length > 120
          ? `${teaser.slice(0, 120)}…`
          : teaser ?? "Deal opportunity";

      await insertWorkflowJob({
        instanceId: jobId,
        workflowKind: "sim-screening",
        userId,
        dealId: opp.id,
        fileName: fileLabel,
        screenerId: input.screenerId,
      });

      await startSimScreeningWorkflow(jobId, {
        jobId,
        userId,
        dealOpportunityId: opp.id,
        screenerId: input.screenerId,
        sessionId: session.id,
        runId: run.id,
      });

      return {
        sessionId: session.id,
        runId: run.id,
        jobId,
        queueName: QUEUE_NAMES.SIM_SCREENING,
      };
    }),

  updateOpportunity: protectedProcedure
    .input(createDealOpportunitySchema.extend({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      const hasFinancials =
        data.revenue != null ||
        data.ebitda != null ||
        data.ebitdaMargin != null ||
        data.askingPrice != null;
      await db
        .update(dealOpportunities)
        .set({
          companyId: data.companyId ?? null,
          leadId: data.leadId || null,
          sourceWebsite: data.sourceWebsite || null,
          brokerage: data.brokerage || null,
          dealTeaser: data.dealTeaser || null,
          description: data.description || null,
          brokerFirstName: data.brokerFirstName || null,
          brokerLastName: data.brokerLastName || null,
          brokerEmail: data.brokerEmail || null,
          brokerPhone: data.brokerPhone || null,
          brokerLinkedIn: data.brokerLinkedIn || null,
        })
        .where(eq(dealOpportunities.id, id));

      if (hasFinancials) {
        await createDealFinancialSnapshot({
          dealOpportunityId: id,
          revenue: data.revenue ?? null,
          ebitda: data.ebitda ?? null,
          ebitdaMargin: data.ebitdaMargin ?? null,
          askingPrice: data.askingPrice ?? null,
          source: "MANUAL",
          createdById: ctx.user.id,
        });
      }

      await upsertDealOpportunityScreening(id);

      after(async () => {
        revalidatePath("/deal-opportunities");
        revalidatePath(`/deal-opportunities/${id}`);
        revalidatePath(`/deal-opportunities/${id}/edit`);
        revalidateTag("deals", "max");
        revalidateTag(`deal-${id}`, "max");
      });
      return { dealOpportunityId: id };
    }),

  deleteOpportunity: protectedProcedure
    .input(deleteOpportunityInputSchema)
    .mutation(async ({ input }) => {
      await db
        .delete(dealOpportunities)
        .where(eq(dealOpportunities.id, input.id));
      after(async () => {
        revalidatePath("/deal-opportunities");
        revalidateTag("deals", "max");
        revalidateTag(`deal-${input.id}`, "max");
      });
      return { success: true };
    }),

  update: protectedProcedure
    .input(updateDealSchema)
    .mutation(async ({ input }) => {
      const { id, ...data } = input;

      await db
        .update(deals)
        .set({
          title: data.title,
          dealCaption: data.deal_caption,
          firstName: data.first_name,
          lastName: data.last_name,
          email: data.email,
          linkedinUrl: data.linkedinurl,
          workPhone: data.work_phone,
          revenue: data.revenue,
          ebitda: data.ebitda,
          ebitdaMargin: data.ebitda_margin,
          grossRevenue: data.gross_revenue,
          companyLocation: data.company_location,
          brokerage: data.brokerage,
          sourceWebsite: data.source_website || "",
          industry: data.industry,
          askingPrice: data.asking_price,
        })
        .where(eq(deals.id, id));

      after(async () => {
        revalidatePath(`/raw-deals/${id}`);
      });
      return { dealId: id };
    }),

  delete: adminProcedure
    .input(adminDeleteDealInputSchema)
    .mutation(async ({ input }) => {
      await DeleteDealById(input.id);

      after(async () => {
        revalidatePath("/raw-deals");
      });
      return { success: true };
    }),

  bulkDelete: protectedProcedure
    .input(bulkDeleteDealsInputSchema)
    .mutation(async ({ input }) => {
      await BulkDeleteDeals(input.dealIds);

      after(async () => {
        revalidatePath("/raw-deals");
      });
      return { success: true };
    }),

  updateTags: protectedProcedure
    .input(updateTagsSchema)
    .mutation(async ({ input }) => {
      await db
        .update(deals)
        .set({ tags: input.tags })
        .where(eq(deals.id, input.dealId));

      after(async () => {
        revalidatePath(`/raw-deals/${input.dealId}`);
        revalidatePath("/raw-deals");
      });
      return { success: true };
    }),

  updateSpecifications: protectedProcedure
    .input(updateSpecificationsSchema)
    .mutation(async ({ input }) => {
      const { dealId, reviewState, status } = input;

      let opp = await GetDealOpportunityById(dealId);
      if (!opp) {
        opp = await GetDealOpportunityByLegacyDealId(dealId);
      }
      if (opp) {
        await db
          .update(dealOpportunities)
          .set({ reviewState: reviewState as ReviewState, status })
          .where(eq(dealOpportunities.id, dealId));
      } else {
        await db
          .update(deals)
          .set({ reviewState: reviewState as ReviewState, status })
          .where(eq(deals.id, dealId));
      }

      after(async () => {
        revalidatePath(opp ? `/deal-opportunities/${dealId}` : `/raw-deals/${dealId}`);
        revalidateTag(`deal-${dealId}`, "max");
        revalidateTag("deals", "max");
        revalidatePath("/raw-deals");
        revalidatePath("/deal-opportunities");
      });
      return { success: true, dealId };
    }),

  uploadDocument: protectedProcedure
    .input(uploadDealDocumentSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;

      // Validate userId exists
      if (!userId || userId.trim() === "") {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User ID is required but not found in session",
        });
      }

      // Validate required fields
      if (!input.dealId || input.dealId.trim() === "") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "dealId is required",
        });
      }

      // Resolve to DealOpportunity (or fallback to legacy Deal)
      const opp = await GetDealOpportunityByLegacyDealId(input.dealId);
      const deal = !opp ? await GetDealById(input.dealId) : null;

      if (!opp) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Deal not migrated. Run db:migrate-deals first.",
        });
      }

      const entityId = opp.id;
      const entityType = "DEAL_OPPORTUNITY" as const;

      let entityMetadata: EntityMetadata;
      if (opp.companyId) {
        const companyId = opp.companyId;
        const [company] = await db
          .select()
          .from(companies)
          .where(eq(companies.id, companyId));
        entityMetadata = {
          name: company?.name ?? opp.dealTeaser?.trim() ?? "Unknown Deal",
          sector: company?.industry ?? null,
          stage: null,
          headquarters: company?.location ?? null,
          revenue: company?.revenueEstimate
            ? parseFloat(String(company.revenueEstimate))
            : null,
          ebitda: company?.ebitdaEstimate
            ? parseFloat(String(company.ebitdaEstimate))
            : null,
        };
      } else {
        entityMetadata = {
          name: opp.dealTeaser?.trim() || "Unknown Deal",
          sector: null,
          stage: null,
          headquarters: null,
          revenue: opp.revenue != null ? Number(opp.revenue) : null,
          ebitda: opp.ebitda != null ? Number(opp.ebitda) : null,
        };
      }

      const finalDir = `dealflow/raw-deals/${input.dealId}`;

      // Generate a unique jobId for this job
      const jobId = randomUUID();

      // Convert base64 to buffer
      const base64Data = input.fileData.split(",")[1] || input.fileData;
      const buffer = Buffer.from(base64Data, "base64");
      const contentHash = createHash("sha256").update(buffer).digest("hex");

      const [existingDealDocument] = await db
        .select({ id: documents.id })
        .from(documents)
        .where(
          and(
            eq(documents.dealOpportunityId, entityId),
            eq(documents.contentHash, contentHash),
          ),
        )
        .limit(1);

      if (existingDealDocument) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This document was already uploaded for this deal",
        });
      }

      // Upload file directly to final Nextcloud location
      const finalPath = `${finalDir}/${input.fileName}`;

      try {
        await uploadBuffer(buffer, finalPath);
        console.log(`[deal-upload] File uploaded to final location`, {
          jobId,
          finalPath,
          size: buffer.length,
        });
      } catch (uploadError) {
        console.error(
          `[deal-upload] Failed to upload file for ${jobId}:`,
          uploadError,
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to upload file to storage: ${uploadError instanceof Error ? uploadError.message : "Unknown error"}`,
        });
      }

      const mimeType = input.fileType || "application/octet-stream";

      // Map DealDocumentCategory to DocumentCategory (they share most values)
      const category = (input.category as DocumentCategory) || "OTHER";

      // Create job data - store final file path
      const jobData: FileUploadJobData = {
        jobId,
        fileName: input.fileName,
        filePath: finalPath, // Path to final file in Nextcloud
        fileSize: buffer.length,
        mimeType,
        userId,
        entityType: "DEAL_OPPORTUNITY" as const,
        entityId,
        entityMetadata,
        fileCategory: category,
        fileDescription: input.description,
        contentHash,
      };

      // Validate required fields
      if (!jobData.userId || jobData.userId.trim() === "") {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `userId is required but was not provided for job ${jobId}`,
        });
      }

      if (!jobData.entityId || jobData.entityId.trim() === "") {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `entityId is required but was not provided for job ${jobId}`,
        });
      }

      if (!jobData.entityMetadata) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `entityMetadata is required but was not provided for job ${jobId}`,
        });
      }

      // Log job data before queueing
      console.log(`[deal-upload] Queueing job with data:`, {
        jobId: jobData.jobId,
        fileName: jobData.fileName,
        userId: jobData.userId,
        entityType: jobData.entityType,
        entityId: jobData.entityId,
        entityMetadata: jobData.entityMetadata,
      });

      await insertWorkflowJob({
        instanceId: jobId,
        workflowKind: "file-upload",
        userId,
        dealId: entityId,
        fileName: input.fileName,
      });
      await startFileUploadWorkflow(jobId, jobData);

      console.log(`[deal-upload] Workflow ${jobId} started`, {
        fileName: input.fileName,
      });

      after(async () => {
        revalidateTag(`deal-${input.dealId}`, "max");
        revalidatePath(`/raw-deals/${input.dealId}`);
      });
      return {
        success: true,
        message: "File upload queued",
        jobId,
        fileName: input.fileName,
      };
    }),

  getBitrixSyncPreview: protectedProcedure
    .input(dealOpportunityIdMinInputSchema)
    .query(async ({ input }) => {
      const result = await getBitrixSyncPreviewData(input.dealOpportunityId);
      if (!result.success) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: result.message,
        });
      }
      return result.data;
    }),

  /** Stages and env flags for AI → Bitrix inject flow (public page; no existing deal row). */
  getBitrixAiInjectContext: publicProcedure.query(async () => {
    const env = getBitrixSyncEnv();
    const stages = getBitrixDealStages();
    const portalBase =
      env?.portalBaseUrl?.trim() ||
      (env?.webhookBaseUrl
        ? inferPortalBaseFromWebhook(env.webhookBaseUrl)
        : "");
    const dealFieldsCatalog = getBitrixDealFieldsCatalog();
    return {
      webhookConfigured: Boolean(env?.webhookBaseUrl),
      categoryIdConfigured: Boolean(env?.dealCategoryId?.trim()),
      portalBaseUrl: portalBase,
      dealCategoryId: env?.dealCategoryId ?? "",
      stages,
      suggestedStageId: env?.defaultStageId?.trim() ?? "",
      teaserFieldConfigured: Boolean(getBitrixDealTeaserFieldCode()),
      dealFieldsCatalogCount: dealFieldsCatalog.length,
      aiBitrixFieldMeta: getAiBitrixFormFieldMeta(),
    };
  }),

  syncDealOpportunityToBitrix: protectedProcedure
    .input(bitrixSyncDealOpportunitySchema)
    .mutation(async ({ input }) => {
      const env = getBitrixSyncEnv();
      if (!env?.webhookBaseUrl) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "Bitrix is not configured (set BITRIX24_WEBHOOK on the server).",
        });
      }
      if (!env.dealCategoryId?.trim()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "BITRIX_DEAL_CATEGORY_ID is not set — add your Bitrix deal pipeline id.",
        });
      }

      let opp = await GetDealOpportunityById(input.dealOpportunityId);
      if (!opp) {
        opp = await GetDealOpportunityByLegacyDealId(input.dealOpportunityId);
      }
      if (!opp) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Deal opportunity not found",
        });
      }

      const fields = buildCrmDealFieldsFromOpportunitySync({
        dealOpportunityId: opp.id,
        categoryId: env.dealCategoryId.trim(),
        stageId: input.stageId,
        title: input.title,
        opportunity: input.opportunity,
        currencyId: input.currencyId,
        comments: input.comments ?? null,
        sourceWebsite: input.sourceWebsite ?? null,
        companyLocation: input.companyLocation ?? null,
        industry: input.industry ?? null,
        ebitda: input.ebitda ?? null,
        ebitdaMargin: input.ebitdaMargin ?? null,
        brokerFirstName: input.brokerFirstName ?? null,
        brokerLastName: input.brokerLastName ?? null,
        brokerEmail: input.brokerEmail ?? null,
        brokerPhone: input.brokerPhone ?? null,
        brokerLinkedIn: input.brokerLinkedIn ?? null,
        askingPrice: input.askingPrice ?? null,
        revenue: input.revenue ?? null,
        teaser: input.teaser ?? null,
        description: input.description ?? null,
      });

      const portalBase =
        env.portalBaseUrl?.trim() ||
        inferPortalBaseFromWebhook(env.webhookBaseUrl);

      let bitrixId: string;
      if (opp.bitrixId?.trim()) {
        await callBitrix("crm.deal.update", {
          id: opp.bitrixId.trim(),
          fields,
        });
        bitrixId = opp.bitrixId.trim();
      } else {
        const created = await callBitrix<number | string>("crm.deal.add", {
          fields,
        });
        bitrixId = String(created);
      }

      const bitrixLink = portalBase
        ? buildBitrixDealDetailUrl(portalBase, bitrixId)
        : null;

      await db
        .update(dealOpportunities)
        .set({
          bitrixId,
          bitrixLink: bitrixLink || null,
          bitrixCreatedAt: opp.bitrixCreatedAt ?? new Date(),
        })
        .where(eq(dealOpportunities.id, opp.id));

      after(async () => {
        revalidatePath("/deal-opportunities");
        revalidatePath(`/deal-opportunities/${opp.id}`);
        revalidatePath(`/deal-opportunities/${opp.id}/sync-bitrix-24`);
        revalidateTag(`deal-${opp.id}`, "max");
        revalidateTag("deals", "max");
      });

      return { bitrixId, bitrixLink };
    }),

  syncScreeningRunToBitrix: protectedProcedure
    .input(bitrixSyncScreeningRunToDealSchema)
    .mutation(async ({ input, ctx }) => {
      const env = getBitrixSyncEnv();
      if (!env?.webhookBaseUrl) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "Bitrix is not configured (set BITRIX24_WEBHOOK on the server).",
        });
      }
      if (!env.dealCategoryId?.trim()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "BITRIX_DEAL_CATEGORY_ID is not set — add your Bitrix deal pipeline id.",
        });
      }

      const session = await getSimScreeningSessionByIdForUser(
        input.sessionId,
        ctx.user.id,
      );
      if (!session || !session.dealOpportunityId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Session is not linked to a deal opportunity.",
        });
      }

      const run = await getSimScreeningRunByIdForUser(input.runId, ctx.user.id);
      if (!run || run.sessionId !== session.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Run not found for this session.",
        });
      }

      if (run.status !== "COMPLETED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only completed runs can be synced to Bitrix.",
        });
      }

      let opp = await GetDealOpportunityById(input.dealOpportunityId);
      if (!opp) {
        opp = await GetDealOpportunityByLegacyDealId(input.dealOpportunityId);
      }
      if (!opp || opp.id !== session.dealOpportunityId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Deal opportunity not found for this screening session.",
        });
      }

      const fields = buildCrmDealFieldsFromOpportunitySync({
        dealOpportunityId: opp.id,
        categoryId: env.dealCategoryId.trim(),
        stageId: input.stageId,
        title: input.title,
        opportunity: input.opportunity,
        currencyId: input.currencyId,
        comments: input.comments ?? null,
        sourceWebsite: input.sourceWebsite ?? null,
        companyLocation: input.companyLocation ?? null,
        industry: input.industry ?? null,
        ebitda: input.ebitda ?? null,
        ebitdaMargin: input.ebitdaMargin ?? null,
        brokerFirstName: input.brokerFirstName ?? null,
        brokerLastName: input.brokerLastName ?? null,
        brokerEmail: input.brokerEmail ?? null,
        brokerPhone: input.brokerPhone ?? null,
        brokerLinkedIn: input.brokerLinkedIn ?? null,
        askingPrice: input.askingPrice ?? null,
        revenue: input.revenue ?? null,
        teaser: input.teaser ?? null,
        description: input.description ?? null,
      });

      const portalBase =
        env.portalBaseUrl?.trim() ||
        inferPortalBaseFromWebhook(env.webhookBaseUrl);

      let bitrixId: string;
      if (opp.bitrixId?.trim()) {
        await callBitrix("crm.deal.update", {
          id: opp.bitrixId.trim(),
          fields,
        });
        bitrixId = opp.bitrixId.trim();
      } else {
        const created = await callBitrix<number | string>("crm.deal.add", {
          fields,
        });
        bitrixId = String(created);
      }

      await callBitrix("crm.timeline.comment.add", {
        fields: {
          ENTITY_ID: Number(bitrixId),
          ENTITY_TYPE: "deal",
          COMMENT: input.screeningComment,
        },
      });

      const bitrixLink = portalBase
        ? buildBitrixDealDetailUrl(portalBase, bitrixId)
        : null;

      await db
        .update(dealOpportunities)
        .set({
          bitrixId,
          bitrixLink: bitrixLink || null,
          bitrixCreatedAt: opp.bitrixCreatedAt ?? new Date(),
        })
        .where(eq(dealOpportunities.id, opp.id));

      after(async () => {
        revalidatePath("/deal-opportunities");
        revalidatePath(`/deal-opportunities/${opp.id}`);
        revalidatePath(`/deal-opportunities/${opp.id}/sync-bitrix-24`);
        revalidatePath(`/screening/${session.id}`);
        revalidateTag(`deal-${opp.id}`, "max");
        revalidateTag("deals", "max");
      });

      return { bitrixId, bitrixLink };
    }),
});
