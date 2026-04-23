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
  bitrixScreeningWidgetUploadBatchSchema,
  bitrixScreeningWidgetDeleteDocumentSchema,
  bitrixScreeningWidgetStartRunSchema,
  bitrixScreeningWidgetRetryCommentSchema,
  bitrixScreeningWidgetRunDetailSchema,
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
import {
  DealType,
  DealDocumentCategory,
  DocumentCategory,
  ReviewState,
} from "@repo/db";
import {
  DeleteDealById,
  BulkDeleteDeals,
  insertDealOpportunityCimDocument,
  insertManualDealRow,
  insertDealOpportunityRow,
  insertDealOpportunityCompanyLink,
  updateDealOpportunityCompanyId,
  deleteDealOpportunityCompanyLinkById,
  insertInvestorDealOpportunityLink,
  deleteInvestorDealOpportunityLinkById,
  createDealOpportunityQuickTx,
  updateDealOpportunityStageById,
  deleteDeterministicScreeningForDealOpportunity,
  insertQualitativeAiScreeningRow,
  updateDealOpportunityListingFields,
  deleteDealOpportunityRow,
  updateLegacyDealRow,
  updateLegacyDealTags,
  updateDealOpportunityReviewAndStatus,
  updateLegacyDealReviewAndStatus,
  updateDealOpportunityBitrixFields,
  insertDealOpportunityFromBitrixImport,
  replaceDealCim,
  upsertCIMExtraction,
  deleteFinancialsForDealCim,
  createDealFinancialSnapshot,
  createDealRiskFlag,
  insertCimScreeningSession,
  insertCimScreeningRun,
  getDocumentFileMetaForDelete,
  deleteDocumentById,
} from "@repo/db/mutations";
import { after } from "@/lib/after";
import { revalidatePath, revalidateTag } from "@/lib/cache-invalidation";
import type { FileUploadJobData, EntityMetadata } from "@repo/redis-queue/types";
import {
  insertWorkflowJob,
  startCimExtractionWorkflow,
  startFileUploadWorkflow,
  startCimMonographScreeningWorkflow,
  startRagIngestionWorkflow,
  startCimScreeningWorkflow,
} from "@/src/lib/workflow-jobs-api";
import { setWorkflowJobState } from "@repo/db/workflow-jobs";
import { createHash, randomUUID } from "crypto";
import {
  GetDealById,
  GetDealOpportunityById,
  GetDealOpportunityByLegacyDealId,
  GetCIMExtractionByDealOpportunityId,
  getActiveCimForDeal,
  GetLatestDealFinancialSnapshotByDealOpportunityId,
  GetDealFinancialSnapshotsByDealOpportunityId,
  GetDealRiskFlagsByDealOpportunityId,
  countDocumentChunksByDealOpportunityId,
  getScreenerById,
  getCimScreeningRunByIdForUser,
  getCimScreeningSessionByIdForUser,
  searchDealOpportunitiesForChat,
  findDealOpportunityDocumentByContentHash,
  getDocumentFileMetaById,
  listDealOpportunityCompanyLinksJoined,
  getDealOpportunityIdAndPrimaryCompany,
  getCompanyIdExists,
  findDealOpportunityCompanyLinkDup,
  getLatestCompanyLinkForDealOpportunity,
  listInvestorDealOpportunityLinksJoined,
  getDealOpportunityIdOnly,
  getInvestorIdExists,
  findInvestorDealOpportunityLinkDup,
  getCompanyRowByIdForDealUpload,
  getCompanyRowByIdForAiScreening,
  getLeadRowById,
  selectDealOpportunityBitrixIds,
  listCimScreeningRunsForDealOpportunity,
  listDealOpportunityDocumentsSummary,
  getCimScreeningAnswersWithQuestionsByRunId,
  getDocumentChunksByIds,
} from "@repo/db/queries";
import {
  buildNextcloudFileUrl,
  uploadBuffer,
  deleteFile,
} from "@repo/nextcloud";
import {
  deleteChunkVectorsForDocument,
  getDocumentChunksVectorIndex,
} from "@/lib/document-chunk-vectorize";
import { TRPCError } from "@trpc/server";
import { QUEUE_NAMES } from "@repo/redis-queue/types";
import {
  upsertDealOpportunityScreening,
  runAiQualitativeScreening,
} from "@repo/deal-screening";
import {
  BITRIX_DEAL_PIPELINE_ID,
  buildBitrixDealDetailUrl,
  buildCrmDealFieldsFromOpportunitySync,
  callBitrix,
  type BitrixContactBrokerFields,
  extractBitrixDealCompanyId,
  extractBitrixDealContactIds,
  extractBitrixDealListStageIdRaw,
  fetchBitrixCompanyTitleMap,
  fetchBitrixContactBrokerMap,
  fetchDealsForSyncPipeline,
  getBitrixDealStages,
  getDefaultBitrixStageId,
  getAiBitrixFormFieldMeta,
  getBitrixDealFieldsCatalog,
  getBitrixSyncEnv,
  inferPortalBaseFromWebhook,
  normalizeBitrixListRow,
  resolveBitrixDealTeaserFieldCode,
} from "@repo/bitrix-sync";
import { getBitrixSyncPreviewData } from "@/lib/server/bitrix-sync-preview-data";
import {
  requireDealOpportunityForBitrixSync,
  upsertBitrixCrmDeal,
} from "@/lib/server/bitrix-deal-opportunity-sync";
import { mapEvidenceChunkIdsToCitations } from "@/lib/map-cim-screening-evidence";
import { fetchBitrixWidgetScreeningListingContext } from "@/lib/server/bitrix-widget-screening-listing-context";
import {
  assertValidBitrixWidgetContext,
  resolveDealOpportunityForBitrixDeal,
} from "@/lib/server/bitrix-widget-deal-resolve";
import {
  fetchBitrixWidgetLinkedEntities,
  type BitrixWidgetLinkedEntities,
} from "@/lib/server/bitrix-widget-linked-entities";
import db, { workflowJobs, and as drizzleAnd, inArray, eq } from "@repo/db";

function defaultDealOpportunityStage(): string {
  return getDefaultBitrixStageId(getBitrixDealStages());
}

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
      return searchDealOpportunitiesForChat({ query, limit });
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

      const existingDealDocument = await findDealOpportunityDocumentByContentHash(
        input.dealOpportunityId,
        contentHash,
      );

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
        documentRecord = await insertDealOpportunityCimDocument({
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
        });
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

      const dealCim = await replaceDealCim({
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
        dealCimId: dealCim.id,
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
        dealCimId: dealCim.id,
      };
    }),

  getActiveCimForOpportunity: protectedProcedure
    .input(dealOpportunityIdInputSchema)
    .query(async ({ input }) => {
      const cim = await getActiveCimForDeal(input.dealOpportunityId);
      if (!cim) return null;
      const doc = await getDocumentFileMetaById(cim.documentId);
      return {
        id: cim.id,
        documentId: cim.documentId,
        fileName: doc?.fileName ?? null,
        uploadedAt: cim.uploadedAt,
        status: cim.status,
      };
    }),

  getCIMAnalysisForOpportunity: protectedProcedure
    .input(dealOpportunityIdInputSchema)
    .query(async ({ input }) => {
      const activeCim = await getActiveCimForDeal(input.dealOpportunityId);
      const extraction = await GetCIMExtractionByDealOpportunityId(
        input.dealOpportunityId,
      );
      const hasFinancials = !!extraction;
      return {
        activeCim: activeCim
          ? {
            id: activeCim.id,
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
      const cim = await getActiveCimForDeal(input.dealOpportunityId);
      if (!cim) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No active CIM upload found for this deal",
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
        dealCimId: cim.id,
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
      const cim = await getActiveCimForDeal(input.dealOpportunityId);
      if (!cim) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No active CIM upload found for this deal",
        });
      }
      await deleteFinancialsForDealCim(cim.id);
      after(async () => {
        revalidateTag(`deal-${input.dealOpportunityId}`, "max");
        revalidatePath(`/deal-opportunities/${input.dealOpportunityId}`);
      });
      return { success: true, canReExtract: true };
    }),

  create: protectedProcedure
    .input(createDealSchema)
    .mutation(async ({ input, ctx }) => {
      const addedDeal = await insertManualDealRow({
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
      });

      after(async () => {
        revalidatePath("/manual-deals");
        revalidateTag("deals", "max");
      });
      return { dealId: addedDeal?.id };
    }),

  /** Public so the Bitrix-embedded AI widget can create rows without app login (page is gated by Bitrix middleware). */
  createOpportunity: publicProcedure
    .input(createDealOpportunitySchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user?.id ?? null;
      const hasFinancials =
        input.revenue != null ||
        input.ebitda != null ||
        input.ebitdaMargin != null ||
        input.askingPrice != null;

      const added = await insertDealOpportunityRow({
        companyId: input.companyId ?? null,
        leadId: input.leadId || null,
        sourceWebsite: input.sourceWebsite || null,
        brokerage: input.brokerage || null,
        revenue: null,
        ebitda: null,
        ebitdaMargin: null,
        askingPrice: null,
        title: input.title?.trim() || null,
        dealTeaser: input.dealTeaser || null,
        description: input.description || null,
        brokerFirstName: input.brokerFirstName || null,
        brokerLastName: input.brokerLastName || null,
        brokerEmail: input.brokerEmail || null,
        brokerPhone: input.brokerPhone || null,
        brokerLinkedIn: input.brokerLinkedIn || null,
        userId,
        stage: defaultDealOpportunityStage(),
      });

      if (added?.id) {
        if (hasFinancials) {
          await createDealFinancialSnapshot({
            dealOpportunityId: added.id,
            revenue: input.revenue ?? null,
            ebitda: input.ebitda ?? null,
            ebitdaMargin: input.ebitdaMargin ?? null,
            askingPrice: input.askingPrice ?? null,
            source: "LISTING",
            createdById: userId,
          });
        }
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
      return listDealOpportunityCompanyLinksJoined(input.dealOpportunityId);
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
      const opp = await getDealOpportunityIdAndPrimaryCompany(
        input.dealOpportunityId,
      );
      if (!opp) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Deal opportunity not found" });
      }

      const company = await getCompanyIdExists(input.companyId);
      if (!company) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Company not found" });
      }

      const dup = await findDealOpportunityCompanyLinkDup(
        input.dealOpportunityId,
        input.companyId,
      );
      if (dup) {
        throw new TRPCError({ code: "CONFLICT", message: "Company already linked to this deal" });
      }

      await insertDealOpportunityCompanyLink({
        dealOpportunityId: input.dealOpportunityId,
        companyId: input.companyId,
        notes: input.notes?.trim() || null,
      });

      // Keep legacy single-company field aligned for compatibility.
      if (!opp.companyId) {
        await updateDealOpportunityCompanyId(
          input.dealOpportunityId,
          input.companyId,
        );
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
      const removed = await deleteDealOpportunityCompanyLinkById(input.linkId);
      if (!removed) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Link not found" });
      }

      const opp = await getDealOpportunityIdAndPrimaryCompany(
        removed.dealOpportunityId,
      );

      if (opp && opp.companyId === removed.companyId) {
        const fallback = await getLatestCompanyLinkForDealOpportunity(
          removed.dealOpportunityId,
        );
        await updateDealOpportunityCompanyId(
          removed.dealOpportunityId,
          fallback?.companyId ?? null,
        );
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
      return listInvestorDealOpportunityLinksJoined(input.dealOpportunityId);
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
      const opp = await getDealOpportunityIdOnly(input.dealOpportunityId);
      if (!opp) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Deal opportunity not found" });
      }

      const investor = await getInvestorIdExists(input.investorId);
      if (!investor) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Investor not found" });
      }

      const dup = await findInvestorDealOpportunityLinkDup(
        input.dealOpportunityId,
        input.investorId,
      );
      if (dup) {
        throw new TRPCError({ code: "CONFLICT", message: "Investor already linked to this deal" });
      }

      await insertInvestorDealOpportunityLink({
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
      const removed = await deleteInvestorDealOpportunityLinkById(input.linkId);
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

      let result: Awaited<ReturnType<typeof createDealOpportunityQuickTx>>;
      try {
        result = await createDealOpportunityQuickTx({
          userId: ctx.user.id,
          themeId: input.themeId?.trim() || null,
          fields: {
            companyId: null,
            leadId: null,
            sourceWebsite: input.sourceWebsite || null,
            brokerage: input.brokerage || null,
            revenue: null,
            ebitda: null,
            ebitdaMargin: null,
            askingPrice: null,
            title: input.title?.trim() || null,
            dealTeaser: input.dealTeaser?.trim() || null,
            description: input.description || null,
            brokerFirstName: input.brokerFirstName || null,
            brokerLastName: input.brokerLastName || null,
            brokerEmail: input.brokerEmail || null,
            brokerPhone: input.brokerPhone || null,
            brokerLinkedIn: input.brokerLinkedIn || null,
            userId: ctx.user.id,
            stage: defaultDealOpportunityStage(),
          },
        });
      } catch (e) {
        if (e instanceof Error && e.message === "THEME_NOT_FOUND") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Selected theme does not exist",
          });
        }
        throw e;
      }

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
      await updateDealOpportunityStageById(input.id, input.stage);

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
      await deleteDeterministicScreeningForDealOpportunity(
        input.dealOpportunityId,
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
        ? getCompanyRowByIdForAiScreening(opp.companyId)
        : Promise.resolve(null);

      const [company, leadFromOpp, latestSnapshot] = await Promise.all([
        companyPromise,
        opp.leadId ? getLeadRowById(opp.leadId) : Promise.resolve(null),
        GetLatestDealFinancialSnapshotByDealOpportunityId(opp.id),
      ]);

      const leadId = opp.leadId ?? company?.firstSeenFromLeadId ?? null;
      const leadRow =
        leadFromOpp ??
        (leadId ? await getLeadRowById(leadId) : null);

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

      await insertQualitativeAiScreeningRow({
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

      const isMonographMode = input.screeningMode === "monograph";
      let targetDocumentId: string | null = null;
      let targetDocumentFileName: string | null = null;
      if (isMonographMode) {
        const dealDocs = await listDealOpportunityDocumentsSummary(opp.id);
        const selectedDoc = dealDocs.find((d) => d.id === input.targetDocumentId);
        if (!selectedDoc) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Selected document does not belong to this deal.",
          });
        }
        if (selectedDoc.ingestionStatus !== "PROCESSED") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Selected document is not indexed yet. Wait for ingestion to finish.",
          });
        }
        targetDocumentId = selectedDoc.id;
        targetDocumentFileName = selectedDoc.fileName;
      }

      const session = await insertCimScreeningSession({
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
      const run = await insertCimScreeningRun({
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

      const headline =
        opp.title?.trim() || opp.dealTeaser?.trim() || "Deal opportunity";
      const fileLabel =
        headline.length > 120 ? `${headline.slice(0, 120)}…` : headline;

      await insertWorkflowJob({
        instanceId: jobId,
        workflowKind: isMonographMode
          ? "cim-monograph-screening"
          : "cim-screening",
        userId,
        dealId: opp.id,
        fileName: targetDocumentFileName ?? fileLabel,
        screenerId: input.screenerId,
      });

      if (isMonographMode && targetDocumentId) {
        await startCimMonographScreeningWorkflow(jobId, {
          jobId,
          userId,
          dealOpportunityId: opp.id,
          targetDocumentId,
          screenerId: input.screenerId,
          sessionId: session.id,
          runId: run.id,
        });
      } else {
        await startCimScreeningWorkflow(jobId, {
          jobId,
          userId,
          dealOpportunityId: opp.id,
          screenerId: input.screenerId,
          sessionId: session.id,
          runId: run.id,
        });
      }

      return {
        sessionId: session.id,
        runId: run.id,
        jobId,
        queueName: isMonographMode
          ? QUEUE_NAMES.CIM_MONOGRAPH_SCREENING
          : QUEUE_NAMES.CIM_SCREENING,
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
      await updateDealOpportunityListingFields(id, {
        companyId: data.companyId ?? null,
        leadId: data.leadId || null,
        sourceWebsite: data.sourceWebsite || null,
        brokerage: data.brokerage || null,
        title: data.title ?? null,
        dealTeaser: data.dealTeaser || null,
        description: data.description || null,
        brokerFirstName: data.brokerFirstName || null,
        brokerLastName: data.brokerLastName || null,
        brokerEmail: data.brokerEmail || null,
        brokerPhone: data.brokerPhone || null,
        brokerLinkedIn: data.brokerLinkedIn || null,
      });

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
      await deleteDealOpportunityRow(input.id);
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

      await updateLegacyDealRow(id, {
        title: data.title,
        dealCaption: data.deal_caption,
        firstName: data.first_name ?? "",
        lastName: data.last_name ?? "",
        email: data.email ?? "",
        linkedinUrl: data.linkedinurl ?? null,
        workPhone: data.work_phone ?? null,
        revenue: data.revenue ?? 0,
        ebitda: data.ebitda ?? 0,
        ebitdaMargin: data.ebitda_margin ?? 0,
        grossRevenue: data.gross_revenue ?? null,
        companyLocation: data.company_location ?? "",
        brokerage: data.brokerage ?? "",
        sourceWebsite: data.source_website || "",
        industry: data.industry ?? "",
        askingPrice: data.asking_price ?? 0,
      });

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
      await updateLegacyDealTags(input.dealId, input.tags);

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
        await updateDealOpportunityReviewAndStatus(
          dealId,
          reviewState as ReviewState,
          status,
        );
      } else {
        await updateLegacyDealReviewAndStatus(
          dealId,
          reviewState as ReviewState,
          status,
        );
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
        const company = await getCompanyRowByIdForDealUpload(companyId);
        entityMetadata = {
          name:
            company?.name ??
            opp.title?.trim() ??
            opp.dealTeaser?.trim() ??
            "Unknown Deal",
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
          name:
            opp.title?.trim() || opp.dealTeaser?.trim() || "Unknown Deal",
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

      const existingDealDocument = await findDealOpportunityDocumentByContentHash(
        entityId,
        contentHash,
      );

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

  getBitrixPipelineStages: protectedProcedure.query(() =>
    getBitrixDealStages(),
  ),

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
      portalBaseUrl: portalBase,
      dealCategoryId: env?.dealCategoryId ?? "",
      stages,
      suggestedStageId: env?.defaultStageId?.trim() ?? "",
      teaserFieldConfigured: Boolean(resolveBitrixDealTeaserFieldCode()),
      dealFieldsCatalogCount: dealFieldsCatalog.length,
      aiBitrixFieldMeta: getAiBitrixFormFieldMeta(),
    };
  }),

  getBitrixScreeningWidgetRunDetail: publicProcedure
    .input(bitrixScreeningWidgetRunDetailSchema)
    .query(async ({ input }) => {
      await assertValidBitrixWidgetContext(input);
      const dealOpportunityId = await resolveDealOpportunityForBitrixDeal(
        input.dealId,
      );
      const runs = await listCimScreeningRunsForDealOpportunity(dealOpportunityId);
      const meta = runs.find((r) => r.runId === input.runId);
      if (!meta) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Screening run not found for this deal.",
        });
      }
      const answers = await getCimScreeningAnswersWithQuestionsByRunId(
        input.runId,
      );
      const evidenceChunkIdsForRun = answers.flatMap(
        (a) => a.evidenceChunkIds ?? [],
      );
      const evidenceChunkRows =
        evidenceChunkIdsForRun.length > 0
          ? await getDocumentChunksByIds(evidenceChunkIdsForRun)
          : [];
      return {
        run: {
          runId: meta.runId,
          status: meta.status,
          errorMessage: meta.errorMessage,
          screenerId: meta.screenerId,
          screenerName: meta.screenerName,
          createdAt: meta.runCreatedAt,
          answers: answers.map((a) => ({
            questionId: a.questionId,
            position: a.position,
            question: a.questionText,
            score: a.score,
            rationale: a.rationale,
            evidenceChunkIds: a.evidenceChunkIds ?? [],
            evidenceCitations: mapEvidenceChunkIdsToCitations(
              a.evidenceChunkIds ?? null,
              evidenceChunkRows,
            ),
          })),
        },
      };
    }),

  uploadBitrixScreeningWidgetDocuments: publicProcedure
    .input(bitrixScreeningWidgetUploadBatchSchema)
    .mutation(async ({ input }) => {
      await assertValidBitrixWidgetContext(input);
      const dealOpportunityId = await resolveDealOpportunityForBitrixDeal(
        input.dealId,
      );
      console.info("[bitrix-widget-upload] batch start", {
        bitrixDealId: input.dealId,
        dealOpportunityId,
        fileCount: input.files.length,
      });
      const opp = await GetDealOpportunityById(dealOpportunityId);
      const actorUserId = opp?.userId?.trim();
      if (!actorUserId) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Deal has no owner user to run ingestion workflow.",
        });
      }

      const env = getBitrixSyncEnv();
      let linkedForMeta: BitrixWidgetLinkedEntities | null = null;
      if (env?.webhookBaseUrl?.trim()) {
        try {
          const rawDeal = await callBitrix<Record<string, unknown>>(
            "crm.deal.get",
            { id: input.dealId },
            { webhookBaseUrl: env.webhookBaseUrl },
          );
          linkedForMeta = await fetchBitrixWidgetLinkedEntities(rawDeal, {
            webhookBaseUrl: env.webhookBaseUrl,
          });
        } catch {
          linkedForMeta = null;
        }
      }

      const uploaded: Array<{ jobId: string; fileName: string }> = [];
      const skippedDuplicate: Array<{ fileName: string; documentId: string }> =
        [];

      for (const file of input.files) {
        const base64Data = file.fileData.split(",")[1] || file.fileData;
        const buffer = Buffer.from(base64Data, "base64");
        const contentHash = createHash("sha256").update(buffer).digest("hex");
        const existing = await findDealOpportunityDocumentByContentHash(
          dealOpportunityId,
          contentHash,
        );
        if (existing) {
          console.info("[bitrix-widget-upload] skip duplicate hash", {
            bitrixDealId: input.dealId,
            dealOpportunityId,
            fileName: file.fileName,
            documentId: existing.id,
          });
          skippedDuplicate.push({
            fileName: file.fileName,
            documentId: existing.id,
          });
          continue;
        }

        const safeBase = file.fileName.replace(/[/\\]/g, "_").slice(0, 180);
        const finalDir = `dealflow/deal_opportunity/${dealOpportunityId}/widget`;
        const finalPath = `${finalDir}/${Date.now()}-${safeBase}`;
        await uploadBuffer(buffer, finalPath);

        const entityMetadata: EntityMetadata = {
          name: (() => {
            const base =
              opp?.title?.trim() ||
              opp?.dealTeaser?.trim() ||
              `Bitrix deal ${input.dealId}`;
            const co = linkedForMeta?.company?.title?.trim();
            return co ? `${base} — ${co}` : base;
          })(),
          sector: linkedForMeta?.company?.industry ?? null,
          stage: opp?.stage ?? null,
          headquarters: opp?.companyLocation ?? null,
          revenue: opp?.revenue != null ? Number(opp.revenue) : null,
          ebitda: opp?.ebitda != null ? Number(opp.ebitda) : null,
        };

        const party =
          linkedForMeta?.company?.title || linkedForMeta?.contact?.displayName
            ? [
              linkedForMeta?.company?.title
                ? `Company: ${linkedForMeta.company.title}`
                : null,
              linkedForMeta?.contact?.displayName
                ? `Contact: ${linkedForMeta.contact.displayName}`
                : null,
            ]
              .filter(Boolean)
              .join(" · ")
            : "";

        const metaLine = [
          `Bitrix widget manual upload · Bitrix deal ${input.dealId} · app deal ${dealOpportunityId}`,
          `contentHash=${contentHash}`,
          party || null,
        ]
          .filter(Boolean)
          .join(" · ");

        const jobId = randomUUID();
        const jobData: FileUploadJobData = {
          jobId,
          fileName: file.fileName,
          filePath: finalPath,
          fileSize: buffer.length,
          mimeType: file.fileType || "application/octet-stream",
          userId: actorUserId,
          entityType: "DEAL_OPPORTUNITY",
          entityId: dealOpportunityId,
          entityMetadata,
          fileCategory: input.category,
          fileDescription: [input.description?.trim(), metaLine]
            .filter(Boolean)
            .join("\n\n"),
          contentHash,
        };

        await insertWorkflowJob({
          instanceId: jobId,
          workflowKind: "file-upload",
          userId: actorUserId,
          dealId: dealOpportunityId,
          fileName: file.fileName,
        });
        console.info("[bitrix-widget-upload] starting file-upload workflow", {
          bitrixDealId: input.dealId,
          dealOpportunityId,
          jobId,
          fileName: file.fileName,
          nextcloudPath: finalPath,
          bytes: buffer.length,
        });
        await startFileUploadWorkflow(jobId, jobData);
        uploaded.push({ jobId, fileName: file.fileName });
      }

      console.info("[bitrix-widget-upload] batch done", {
        bitrixDealId: input.dealId,
        dealOpportunityId,
        uploaded: uploaded.length,
        skippedDuplicate: skippedDuplicate.length,
      });
      return {
        success: true,
        dealOpportunityId,
        uploaded,
        skippedDuplicate,
      };
    }),

  deleteBitrixScreeningWidgetDocument: publicProcedure
    .input(bitrixScreeningWidgetDeleteDocumentSchema)
    .mutation(async ({ input }) => {
      await assertValidBitrixWidgetContext(input);
      const dealOpportunityId = await resolveDealOpportunityForBitrixDeal(
        input.dealId,
      );
      const doc = await getDocumentFileMetaForDelete(input.documentId);
      if (!doc) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      }
      const matchesDeal =
        doc.entityType === "DEAL_OPPORTUNITY" &&
        (doc.entityId === dealOpportunityId ||
          doc.dealOpportunityId === dealOpportunityId);
      if (!matchesDeal) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Document does not belong to this deal",
        });
      }
      try {
        const vectorIndex = getDocumentChunksVectorIndex();
        if (vectorIndex) {
          await deleteChunkVectorsForDocument(
            db,
            vectorIndex,
            input.documentId,
          );
        }
      } catch (err) {
        console.error(
          "[deleteBitrixScreeningWidgetDocument] Vectorize chunk cleanup failed",
          err,
        );
      }
      await deleteFile(doc.fileUrl);
      await deleteDocumentById(input.documentId);
      console.info("[bitrix-widget-delete-document]", {
        bitrixDealId: input.dealId,
        dealOpportunityId,
        documentId: input.documentId,
      });
      return { success: true as const };
    }),

  startBitrixScreeningWidgetRun: publicProcedure
    .input(bitrixScreeningWidgetStartRunSchema)
    .mutation(async ({ input }) => {
      await assertValidBitrixWidgetContext(input);
      const dealOpportunityId = await resolveDealOpportunityForBitrixDeal(
        input.dealId,
      );
      const opp = await GetDealOpportunityById(dealOpportunityId);
      const actorUserId = opp?.userId?.trim();
      if (!actorUserId) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Deal has no owner user to run screening workflow.",
        });
      }

      const chunkCount =
        await countDocumentChunksByDealOpportunityId(dealOpportunityId);
      if (chunkCount === 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "No indexed documents for this deal yet. Upload files and wait until ingestion finishes.",
        });
      }

      const dealDocs = await listDealOpportunityDocumentsSummary(
        dealOpportunityId,
      );
      const isMonographMode = input.screeningMode === "monograph";
      let selectedDocument:
        | (typeof dealDocs)[number]
        | undefined;
      if (isMonographMode) {
        selectedDocument = dealDocs.find((d) => d.id === input.targetDocumentId);
        if (!selectedDocument) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Selected document does not belong to this deal.",
          });
        }
        if (selectedDocument.ingestionStatus !== "PROCESSED") {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              "Selected document is not indexed yet. Wait until ingestion finishes.",
          });
        }
      }
      let snapshotRows = dealDocs.filter((d) => d.ingestionStatus === "PROCESSED");
      if (snapshotRows.length === 0) {
        snapshotRows = dealDocs;
      }
      const dealDocumentsSnapshot = {
        documents: snapshotRows.map((d) => ({
          id: d.id,
          fileName: d.fileName,
          contentHash: d.contentHash,
        })),
        vectorSettleMs: Math.min(
          Math.max(
            Number(process.env.BITRIX_WIDGET_VECTOR_SETTLE_MS ?? 12_000),
            2_000,
          ),
          300_000,
        ),
        screeningMode: isMonographMode ? "monograph" : "rag",
        focusedDocumentId: selectedDocument?.id ?? null,
        focusedDocumentFileName: selectedDocument?.fileName ?? null,
      };

      const active = await db
        .select({ instanceId: workflowJobs.instanceId })
        .from(workflowJobs)
        .where(
          drizzleAnd(
            inArray(workflowJobs.workflowKind, [
              "cim-screening",
              "cim-monograph-screening",
            ]),
            eq(workflowJobs.dealId, dealOpportunityId),
            eq(workflowJobs.screenerId, input.screenerId),
            inArray(workflowJobs.state, ["waiting", "active", "delayed"]),
          ),
        )
        .limit(1);
      if (active.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A screening run is already active for this deal and screener.",
        });
      }

      if (!isMonographMode) {
        await new Promise<void>((resolve) => {
          setTimeout(resolve, dealDocumentsSnapshot.vectorSettleMs);
        });
      }

      const session = await insertCimScreeningSession({
        userId: actorUserId,
        dealOpportunityId,
      });
      if (!session) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create screening session",
        });
      }

      const jobId = randomUUID();
      const run = await insertCimScreeningRun({
        sessionId: session.id,
        screenerId: input.screenerId,
        workflowInstanceId: jobId,
        dealDocumentsSnapshot,
      });
      if (!run) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create screening run",
        });
      }

      await insertWorkflowJob({
        instanceId: jobId,
        workflowKind: isMonographMode
          ? "cim-monograph-screening"
          : "cim-screening",
        userId: actorUserId,
        dealId: dealOpportunityId,
        fileName:
          selectedDocument?.fileName ??
          opp?.title ??
          opp?.dealTeaser ??
          `Bitrix deal ${input.dealId}`,
        screenerId: input.screenerId,
      });

      const bitrixEnv = getBitrixSyncEnv();
      const bitrixLiveDealListingContext =
        (await fetchBitrixWidgetScreeningListingContext({
          webhookBaseUrl: bitrixEnv?.webhookBaseUrl,
          bitrixDealId: input.dealId,
        })) ?? "";

      if (isMonographMode && selectedDocument) {
        await startCimMonographScreeningWorkflow(jobId, {
          jobId,
          userId: actorUserId,
          dealOpportunityId,
          targetDocumentId: selectedDocument.id,
          screenerId: input.screenerId,
          sessionId: session.id,
          runId: run.id,
          bitrixDealId: input.dealId,
          postBitrixComment: true,
          dealListingContextSource: "bitrix_live_snapshot",
          bitrixLiveDealListingContext,
        });
      } else {
        await startCimScreeningWorkflow(jobId, {
          jobId,
          userId: actorUserId,
          dealOpportunityId,
          screenerId: input.screenerId,
          sessionId: session.id,
          runId: run.id,
          bitrixDealId: input.dealId,
          postBitrixComment: true,
          dealListingContextSource: "bitrix_live_snapshot",
          bitrixLiveDealListingContext,
        });
      }

      return {
        success: true,
        dealOpportunityId,
        sessionId: session.id,
        runId: run.id,
        jobId,
        queueName: isMonographMode
          ? QUEUE_NAMES.CIM_MONOGRAPH_SCREENING
          : QUEUE_NAMES.CIM_SCREENING,
      };
    }),

  retryBitrixScreeningWidgetComment: publicProcedure
    .input(bitrixScreeningWidgetRetryCommentSchema)
    .mutation(async ({ input }) => {
      await assertValidBitrixWidgetContext(input);
      const env = getBitrixSyncEnv();
      if (!env?.webhookBaseUrl) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Bitrix is not configured.",
        });
      }
      const run = await db
        .select({
          id: workflowJobs.instanceId,
          returnValue: workflowJobs.returnValue,
        })
        .from(workflowJobs)
        .where(eq(workflowJobs.instanceId, input.runId))
        .limit(1);
      const payload = run[0]?.returnValue as
        | { score?: number; status?: string; screenerName?: string }
        | undefined;
      const summary = [
        `Screening run ${input.runId}`,
        payload?.screenerName ? `Screener: ${payload.screenerName}` : null,
        payload?.status ? `Status: ${payload.status}` : null,
        typeof payload?.score === "number" ? `Score: ${payload.score}/10` : null,
      ]
        .filter(Boolean)
        .join("\n");

      await callBitrix(
        "crm.timeline.comment.add",
        {
          fields: {
            ENTITY_ID: Number(input.dealId),
            ENTITY_TYPE: "deal",
            COMMENT: summary || "Screening run completed.",
          },
        },
        { webhookBaseUrl: env.webhookBaseUrl },
      );
      return { success: true };
    }),

  /** Public for the Bitrix-embedded AI widget (same middleware story as createOpportunity). */
  syncDealOpportunityToBitrix: publicProcedure
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

      const opp = await requireDealOpportunityForBitrixSync(
        input.dealOpportunityId,
      );
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

      const { bitrixId } = await upsertBitrixCrmDeal(opp, fields);
      const portalBase =
        env.portalBaseUrl?.trim() ||
        inferPortalBaseFromWebhook(env.webhookBaseUrl);
      const bitrixLink = portalBase
        ? buildBitrixDealDetailUrl(portalBase, bitrixId)
        : null;

      await updateDealOpportunityBitrixFields(opp.id, {
        bitrixId,
        bitrixLink: bitrixLink || null,
        bitrixCreatedAt: opp.bitrixCreatedAt ?? new Date(),
      });

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

      const session = await getCimScreeningSessionByIdForUser(
        input.sessionId,
        ctx.user.id,
      );
      if (!session || !session.dealOpportunityId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Session is not linked to a deal opportunity.",
        });
      }

      const run = await getCimScreeningRunByIdForUser(input.runId, ctx.user.id);
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

      const opp = await requireDealOpportunityForBitrixSync(
        input.dealOpportunityId,
      );
      if (opp.id !== session.dealOpportunityId) {
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

      const { bitrixId } = await upsertBitrixCrmDeal(opp, fields);

      await callBitrix("crm.timeline.comment.add", {
        fields: {
          ENTITY_ID: Number(bitrixId),
          ENTITY_TYPE: "deal",
          COMMENT: input.screeningComment,
        },
      });

      const portalBase =
        env.portalBaseUrl?.trim() ||
        inferPortalBaseFromWebhook(env.webhookBaseUrl);
      const bitrixLink = portalBase
        ? buildBitrixDealDetailUrl(portalBase, bitrixId)
        : null;

      await updateDealOpportunityBitrixFields(opp.id, {
        bitrixId,
        bitrixLink: bitrixLink || null,
        bitrixCreatedAt: opp.bitrixCreatedAt ?? new Date(),
      });

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

  syncDealOpportunitiesFromBitrix: protectedProcedure.mutation(
    async ({ ctx }) => {
      const log = "[bitrix-pull-deals]";
      const env = getBitrixSyncEnv();
      if (!env?.webhookBaseUrl) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "BITRIX24_WEBHOOK is not configured.",
        });
      }

      const rawRows = await fetchDealsForSyncPipeline();

      console.log(rawRows.slice(12, 20))
      const bitrixStages = getBitrixDealStages();

      const firstRow = rawRows[0];
      const firstRowFieldKeys =
        firstRow && typeof firstRow === "object"
          ? Object.keys(firstRow as object).sort()
          : [];
      let missingRawStageId = 0;
      for (const r of rawRows) {
        if (!extractBitrixDealListStageIdRaw(r as Record<string, unknown>)) {
          missingRawStageId += 1;
        }
      }
      const stageFieldSample = rawRows.slice(0, 5).map((r) => {
        const row = r as Record<string, unknown>;
        return { id: row.ID, STAGE_ID: row.STAGE_ID, stage_id: row.stage_id };
      });
      console.info(log, "crm.deal.list", {
        pipelineCategoryId: BITRIX_DEAL_PIPELINE_ID,
        rawRowCount: rawRows.length,
        configuredStageCount: bitrixStages.length,
        missingRawStageIdCount: missingRawStageId,
        firstRowFieldKeys,
        stageFieldSample,
      });

      const contactIds = rawRows.flatMap((r) =>
        extractBitrixDealContactIds(r as Record<string, unknown>),
      );

      let contactById = new Map<string, BitrixContactBrokerFields>();
      try {
        contactById = await fetchBitrixContactBrokerMap(contactIds, {
          webhookBaseUrl: env.webhookBaseUrl,
        });
      } catch (e) {
        console.warn(
          log,
          "crm.contact.list failed; broker UFs only",
          e instanceof Error ? e.message : e,
        );
      }
      console.info(log, "contacts resolved", {
        contactIdRefs: contactIds.length,
        distinctContactIds: new Set(contactIds).size,
        contactMapSize: contactById.size,
      });

      const companyIds = rawRows
        .map((r) => extractBitrixDealCompanyId(r as Record<string, unknown>))
        .filter((id): id is string => Boolean(id));

      let companyTitleById = new Map<string, string>();
      try {
        companyTitleById = await fetchBitrixCompanyTitleMap(companyIds, {
          webhookBaseUrl: env.webhookBaseUrl,
        });
      } catch (e) {
        console.warn(
          log,
          "crm.company.list failed; brokerage names omitted",
          e instanceof Error ? e.message : e,
        );
      }
      console.info(log, "companies resolved", {
        companyIdRefs: companyIds.length,
        distinctCompanyIds: new Set(companyIds).size,
        companyMapSize: companyTitleById.size,
      });

      const normalized = rawRows
        .map((r) =>
          normalizeBitrixListRow(r as Record<string, unknown>, bitrixStages, {
            contactById,
            companyTitleById,
          }),
        )
        .filter((n): n is NonNullable<typeof n> => n != null);

      const stageHistogram: Record<string, number> = {};
      for (const n of normalized) {
        stageHistogram[n.stage] = (stageHistogram[n.stage] ?? 0) + 1;
      }
      console.info(log, "rows normalized", {
        normalizedCount: normalized.length,
        droppedNoBitrixId: rawRows.length - normalized.length,
        distinctStages: Object.keys(stageHistogram).length,
        stageHistogram,
      });

      const impliedEbitdaRows = normalized.filter((n) =>
        (n.ebitdaParseDebug?.notes ?? []).some((x) =>
          x.startsWith("ebitda:implied"),
        ),
      ).length;
      console.info(log, "ebitda / margin (normalized, pre-insert)", {
        totalRows: normalized.length,
        withRevenue: normalized.filter((n) => n.revenue != null).length,
        withEbitda: normalized.filter((n) => n.ebitda != null).length,
        withEbitdaMargin: normalized.filter((n) => n.ebitdaMargin != null)
          .length,
        withNeither: normalized.filter(
          (n) => n.ebitda == null && n.ebitdaMargin == null,
        ).length,
        impliedEbitdaFromRevenueMargin: impliedEbitdaRows,
      });
      console.info(
        log,
        "ebitda parse sample (first 10 bitrixIds)",
        normalized.slice(0, 10).map((n) => ({
          bitrixId: n.bitrixId,
          title: n.title,
          revenue: n.revenue,
          ebitda: n.ebitda,
          ebitdaMargin: n.ebitdaMargin,
          notes: n.ebitdaParseDebug?.notes ?? [],
        })),
      );

      const totalFromBitrix = normalized.length;
      if (totalFromBitrix === 0) {
        console.info(log, "early exit: nothing to import");
        return { imported: 0, skipped: 0, totalFromBitrix: 0 };
      }

      const existingRows = await selectDealOpportunityBitrixIds(
        normalized.map((n) => n.bitrixId),
      );
      const existing = new Set(
        existingRows
          .map((r) => r.bitrixId)
          .filter((id): id is string => Boolean(id?.trim())),
      );
      console.info(log, "existing deal opportunities", {
        existingBitrixIdCount: existing.size,
        candidateCount: totalFromBitrix,
      });

      const portalBase =
        env.portalBaseUrl?.trim() ||
        inferPortalBaseFromWebhook(env.webhookBaseUrl);

      let imported = 0;
      let skipped = 0;
      let financialDetailLogsRemaining = 20;

      for (const row of normalized) {
        if (existing.has(row.bitrixId)) {
          skipped += 1;
          continue;
        }

        const bitrixLink = portalBase
          ? buildBitrixDealDetailUrl(portalBase, row.bitrixId)
          : null;

        try {
          if (financialDetailLogsRemaining > 0) {
            financialDetailLogsRemaining -= 1;
            console.info(log, "row financials (detail sample)", {
              bitrixId: row.bitrixId,
              title: row.title,
              revenue: row.revenue,
              ebitda: row.ebitda,
              ebitdaMargin: row.ebitdaMargin,
              askingPrice: row.askingPrice,
              ebitdaParseNotes: row.ebitdaParseDebug?.notes ?? [],
            });
          }
          const added = await insertDealOpportunityFromBitrixImport({
            stage: row.stage,
            brokerage: row.brokerage,
            sourceWebsite: row.sourceWebsite,
            companyLocation: row.companyLocation,
            cimLink: row.cimLink,
            dataRoomLink: row.dataRoomLink,
            revenue: row.revenue,
            ebitda: row.ebitda,
            ebitdaMargin: row.ebitdaMargin,
            askingPrice: row.askingPrice,
            title: row.title,
            dealTeaser: row.dealTeaser,
            description: row.description,
            brokerFirstName: row.brokerFirstName,
            brokerLastName: row.brokerLastName,
            brokerEmail: row.brokerEmail,
            brokerPhone: row.brokerPhone,
            brokerLinkedIn: row.brokerLinkedIn,
            bitrixId: row.bitrixId,
            bitrixLink: bitrixLink || null,
            bitrixCreatedAt: row.bitrixCreatedAt ?? new Date(),
            userId: ctx.user.id,
            dealType: DealType.MANUAL,
          });

          if (!added?.id) {
            console.warn(log, "insert returned no row id", {
              bitrixId: row.bitrixId,
            });
            continue;
          }

          if (
            row.revenue != null ||
            row.ebitda != null ||
            row.ebitdaMargin != null ||
            row.askingPrice != null
          ) {
            await createDealFinancialSnapshot({
              dealOpportunityId: added.id,
              revenue: row.revenue ?? null,
              ebitda: row.ebitda ?? null,
              ebitdaMargin: row.ebitdaMargin ?? null,
              askingPrice: row.askingPrice ?? null,
              source: "LISTING",
              createdById: ctx.user.id,
            });
          }
          imported += 1;
          existing.add(row.bitrixId);
          console.debug(log, "imported", {
            bitrixId: row.bitrixId,
            dealOpportunityId: added.id,
            title: row.title,
            stage: row.stage,
          });
        } catch (e) {
          if (isUniqueViolationError(e)) {
            skipped += 1;
            existing.add(row.bitrixId);
            console.debug(log, "skip unique violation (concurrent import?)", {
              bitrixId: row.bitrixId,
            });
            continue;
          }
          console.error(log, "import failed", {
            bitrixId: row.bitrixId,
            error: e instanceof Error ? e.message : e,
          });
          throw e;
        }
      }

      after(async () => {
        revalidatePath("/deal-opportunities");
        revalidateTag("deals", "max");
      });

      console.info(log, "sync complete", {
        rawRowCount: rawRows.length,
        normalizedCount: totalFromBitrix,
        imported,
        skipped,
      });

      return { imported, skipped, totalFromBitrix };
    },
  ),
});
