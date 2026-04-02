import { z } from "zod";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../init";
import db, {
  deals,
  dealOpportunities,
  dealOpportunityScreenings,
  aiScreenings,
  companies,
  leads,
  eq,
  and,
  or,
  isNull,
  ilike,
  desc,
  DealType,
  DealStatus,
  documents,
  DealDocumentCategory,
  DocumentCategory,
  ReviewState,
  DealFinancialSnapshotSource,
  DealRiskSeverity,
  DealRiskType,
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
} from "@/src/lib/workflow-jobs-api";
import { randomUUID } from "crypto";
import { createId } from "@paralleldrive/cuid2";
import {
  GetDealById,
  GetDealOpportunityById,
  GetDealOpportunityByLegacyDealId,
  GetCIMExtractionByDealOpportunityId,
  getActiveSimForDeal,
  GetLatestDealFinancialSnapshotByDealOpportunityId,
  GetDealFinancialSnapshotsByDealOpportunityId,
  GetDealRiskFlagsByDealOpportunityId,
} from "@repo/db/queries";
import {
  replaceDealSim,
  upsertCIMExtraction,
  deleteFinancialsForSim,
  createDealFinancialSnapshot,
  createDealRiskFlag,
} from "@repo/db/mutations";
import { buildNextcloudFileUrl, uploadBuffer } from "@repo/nextcloud";
import { TRPCError } from "@trpc/server";
import {
  upsertDealOpportunityScreening,
  runAiQualitativeScreening,
} from "@repo/deal-screening";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const formatUsd = (value: number) => currencyFormatter.format(value);

const createDealSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email: z.string().email("Invalid email address").optional(),
  linkedinurl: z.string().url("Invalid URL").optional(),
  deal_caption: z
    .string()
    .min(5, { message: "Deal caption should be at least 5 characters long" }),
  title: z
    .string()
    .min(5, { message: "Title should be at least 5 characters long" }),
  work_phone: z.string().optional(),
  revenue: z.number().positive("Revenue must be a positive number"),
  ebitda: z.number(),
  ebitda_margin: z.number(),
  gross_revenue: z.number().positive("Gross revenue must be a positive number"),
  company_location: z.string().optional(),
  brokerage: z.string().min(1, "Brokerage is required"),
  source_website: z.string().url("Invalid URL").optional(),
  industry: z.string().min(1, "Industry is required"),
  asking_price: z
    .number()
    .positive("Asking price must be a positive number")
    .optional(),
});

const updateDealSchema = z.object({
  id: z.string(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email: z.string().optional(),
  linkedinurl: z.string().optional(),
  deal_caption: z
    .string()
    .min(5, { message: "Deal caption should be at least 5 characters long" }),
  title: z
    .string()
    .min(5, { message: "Title should be at least 5 characters long" }),
  work_phone: z.string().optional(),
  revenue: z.number().optional(),
  ebitda: z.number().optional(),
  ebitda_margin: z.number().optional(),
  gross_revenue: z.number().optional(),
  company_location: z.string().optional(),
  brokerage: z.string().optional(),
  source_website: z.string().optional(),
  inventory: z.number().optional(),
  industry: z.string().optional(),
  asking_price: z.number().optional(),
});

const updateTagsSchema = z.object({
  dealId: z.string(),
  tags: z.array(z.string()).min(1, "At least one tag is required"),
});

const updateSpecificationsSchema = z.object({
  dealId: z.string(),
  reviewState: z.enum(["NOT_SEEN", "SEEN", "REVIEWED", "PUBLISHED"] as const),
  status: z.nativeEnum(DealStatus),
});

const createDealOpportunitySchema = z.object({
  companyId: z.string().min(1, "Company is required"),
  leadId: z.string().optional(),
  sourceWebsite: z.string().optional(),
  brokerage: z.string().optional(),
  revenue: z.coerce.number().optional(),
  ebitda: z.coerce.number().optional(),
  ebitdaMargin: z.coerce.number().optional(),
  askingPrice: z.coerce.number().optional(),
  dealTeaser: z.string().optional(),
  description: z.string().optional(),
  brokerFirstName: z.string().optional(),
  brokerLastName: z.string().optional(),
  brokerEmail: z.union([z.string().email(), z.literal("")]).optional(),
  brokerPhone: z.string().optional(),
  brokerLinkedIn: z.string().optional(),
});

const createOpportunityQuickSchema = z.object({
  dealTeaser: z.string().min(1, "Deal title is required"),
  sourceWebsite: z.string().optional(),
  brokerage: z.string().optional(),
  revenue: z.coerce.number().optional(),
  ebitda: z.coerce.number().optional(),
  ebitdaMargin: z.coerce.number().optional(),
  askingPrice: z.coerce.number().optional(),
  description: z.string().optional(),
  brokerFirstName: z.string().optional(),
  brokerLastName: z.string().optional(),
  brokerEmail: z.union([z.string().email(), z.literal("")]).optional(),
  brokerPhone: z.string().optional(),
  brokerLinkedIn: z.string().optional(),
});

const addFinancialSnapshotSchema = z.object({
  dealOpportunityId: z.string().min(1),
  revenue: z.number().nullable().optional(),
  ebitda: z.number().nullable().optional(),
  ebitdaMargin: z.number().nullable().optional(),
  askingPrice: z.number().nullable().optional(),
  impliedMultiple: z.number().nullable().optional(),
  source: z.nativeEnum(DealFinancialSnapshotSource).default("MANUAL"),
  notes: z.string().optional(),
});

const addRiskFlagSchema = z.object({
  dealOpportunityId: z.string().min(1),
  riskType: z.nativeEnum(DealRiskType),
  severity: z.nativeEnum(DealRiskSeverity),
  description: z.string().min(1),
});

const updateOpportunityStageSchema = z.object({
  id: z.string(),
  stage: z.enum([
    "LISTED",
    "INITIAL_REVIEW",
    "SCREENED",
    "MEETING_HELD",
    "IOI_SUBMITTED",
    "LOI_SUBMITTED",
    "DILIGENCE",
    "CLOSED",
    "DEAD",
  ]),
});

const screenOpportunitySchema = z.object({
  id: z.string(),
});

const uploadDealDocumentSchema = z.object({
  dealId: z.string(),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  category: z.nativeEnum(DealDocumentCategory),
  tags: z.array(z.string()).optional().default([]),
  fileData: z.string(), // base64 encoded file
  fileName: z.string(),
  fileType: z.string(),
});

const uploadCIMSchema = z.object({
  dealOpportunityId: z.string().min(1, "Deal opportunity ID is required"),
  entityName: z.string().min(1, "Entity name is required"),
  fileData: z.string(),
  fileName: z.string().min(1, "File name is required"),
});

const editFinancialsSchema = z.object({
  dealOpportunityId: z.string().min(1),
  revenueHistory: z.record(z.string(), z.number()).optional().nullable(),
  ebitdaHistory: z.record(z.string(), z.number()).optional().nullable(),
  employeeCount: z.number().optional().nullable(),
  customerConcentration: z.number().optional().nullable(),
  capexIntensity: z.string().optional().nullable(),
  revenueBreakdown: z.record(z.string(), z.number()).optional().nullable(),
  growthDrivers: z.array(z.string()).optional().nullable(),
  keyRisks: z.array(z.string()).optional().nullable(),
  industryOverview: z.string().optional().nullable(),
  transactionDetails: z.string().optional().nullable(),
});

export const dealsRouter = createTRPCRouter({
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
      const finalPath = `dealflow/deal_opportunity/${input.dealOpportunityId}/cim/${input.fileName}`;

      await uploadBuffer(buffer, finalPath);

      const publicUrl = buildNextcloudFileUrl(finalPath);

      const [documentRecord] = await db
        .insert(documents)
        .values({
          entityType: "DEAL_OPPORTUNITY",
          entityId: input.dealOpportunityId,
          dealOpportunityId: input.dealOpportunityId,
          title: input.fileName,
          description: `CIM for ${input.entityName}`,
          category: "PROSPECTUS",
          fileUrl: publicUrl,
          fileName: input.fileName,
          fileSize: buffer.length,
          mimeType: "application/pdf",
          uploadedById: userId,
        })
        .returning();

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
      await startRagIngestionWorkflow(ragJobId, {
        documentId: documentRecord.id,
        userId,
      });

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
    .input(z.object({ dealOpportunityId: z.string() }))
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
    .input(z.object({ dealOpportunityId: z.string() }))
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
    .input(z.object({ dealOpportunityId: z.string() }))
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
          companyId: input.companyId,
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

  createOpportunityQuick: protectedProcedure
    .input(createOpportunityQuickSchema)
    .mutation(async ({ input, ctx }) => {
      const hasFinancials =
        input.revenue != null ||
        input.ebitda != null ||
        input.ebitdaMargin != null ||
        input.askingPrice != null;

      const result = await db.transaction(async (tx) => {
        const normalizedName = `quickadd_${createId()}`;
        const companyName = input.dealTeaser.slice(0, 255);

        const [company] = await tx
          .insert(companies)
          .values({
            name: companyName,
            normalizedName,
            location: null,
            coverageStatus: "UNCONTACTED",
          })
          .returning();

        if (!company) throw new Error("Failed to create company");

        const [opp] = await tx
          .insert(dealOpportunities)
          .values({
            companyId: company.id,
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

        return { company, opp };
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
        revalidatePath(`/companies/${result.company.id}`);
        revalidateTag("deals", "max");
        revalidateTag("companies", "max");
      });
      return {
        dealOpportunityId: result.opp.id,
        companyId: result.company.id,
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
    .input(z.object({ dealOpportunityId: z.string().min(1) }))
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
    .input(z.object({ dealOpportunityId: z.string().min(1) }))
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
    .input(z.object({ dealOpportunityId: z.string() }))
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
    .input(z.object({ dealOpportunityId: z.string() }))
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

      const [company, leadFromOpp, latestSnapshot] = await Promise.all([
        db
          .select()
          .from(companies)
          .where(
            and(eq(companies.id, opp.companyId), isNull(companies.deletedAt)),
          )
          .limit(1)
          .then((r) => r[0] ?? null),
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
          companyId: data.companyId,
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
    .input(z.object({ id: z.string() }))
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
    .input(z.object({ id: z.string(), dealType: z.nativeEnum(DealType) }))
    .mutation(async ({ input }) => {
      await DeleteDealById(input.id);

      after(async () => {
        revalidatePath("/raw-deals");
      });
      return { success: true };
    }),

  bulkDelete: protectedProcedure
    .input(z.object({ dealIds: z.array(z.string()).min(1) }))
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
      {
        const [company] = await db
          .select()
          .from(companies)
          .where(eq(companies.id, opp.companyId));
        entityMetadata = {
          name: company?.name ?? "Unknown Deal",
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
      }

      const finalDir = `dealflow/raw-deals/${input.dealId}`;

      // Generate a unique jobId for this job
      const jobId = randomUUID();

      // Convert base64 to buffer
      const base64Data = input.fileData.split(",")[1] || input.fileData;
      const buffer = Buffer.from(base64Data, "base64");

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
});
