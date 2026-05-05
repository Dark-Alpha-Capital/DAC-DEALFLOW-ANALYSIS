import { db } from "..";
import {
  deals,
  screeners,
  screenerQuestions,
  screenerResponses,
  aiScreenings,
  questionnaires,
  cimExtractions,
  dealCims,
  dealFinancialSnapshots,
  companyFinancialSnapshots,
  companies,
  dealRiskFlags,
  dealOpportunities,
  cimScreeningSessions,
  cimScreeningRuns,
  cimScreeningAnswers,
} from "../schema";
import type {
  DealFinancialSnapshotSource,
  CompanyFinancialSnapshotSource,
  DealRiskSeverity,
  DealRiskType,
  ScreenerResponseSource,
} from "../enums";
import { eq, inArray, and, desc } from "drizzle-orm";

export interface CIMExtractionPayload {
  revenueHistory?: Record<string, number> | null;
  ebitdaHistory?: Record<string, number> | null;
  employeeCount?: number | null;
  customerConcentration?: number | null;
  capexIntensity?: string | null;
  revenueBreakdown?: Record<string, number> | null;
  growthDrivers?: string[] | null;
  keyRisks?: string[] | null;
  industryOverview?: string | null;
  transactionDetails?: string | null;
}

export interface CreateDealFinancialSnapshotInput {
  dealOpportunityId: string;
  revenue?: number | null;
  ebitda?: number | null;
  ebitdaMargin?: number | null;
  askingPrice?: number | null;
  impliedMultiple?: number | null;
  source: DealFinancialSnapshotSource;
  notes?: string | null;
  createdById?: string | null;
}

export interface CreateCompanyFinancialSnapshotInput {
  companyId: string;
  periodEnd: Date;
  revenue?: number | null;
  ebitda?: number | null;
  grossMargin?: number | null;
  revenueCagr?: number | null;
  employees?: number | null;
  totalClients?: number | null;
  top10Concentration?: number | null;
  recurringRevenuePct?: number | null;
  source: CompanyFinancialSnapshotSource;
  notes?: string | null;
  createdById?: string | null;
}

export const BulkDeleteDeals = async (dealIds: readonly string[]) => {
  try {
    if (!dealIds?.length) {
      throw new Error("No deals to delete");
    }

    await db.delete(deals).where(inArray(deals.id, dealIds as string[]));
  } catch (error) {
    console.error("Error deleting deals:", error);
    throw error;
  }
};

/**
 * Delete a deal by id
 * @param dealId - the id of the deal to delete
 */
export const DeleteDealById = async (dealId: string) => {
  try {
    await db.delete(deals).where(eq(deals.id, dealId));
  } catch (error) {
    console.error("Error deleting deal:", error);
    throw error;
  }
};

export const DeleteScreenerById = async (screenerId: string) => {
  try {
    await db.delete(screeners).where(eq(screeners.id, screenerId));
  } catch (error) {
    console.error("Error deleting screener:", error);
    throw error;
  }
};

/** Returns number of rows deleted (0 if no matching question). */
export const DeleteScreenerQuestionById = async (
  screenerId: string,
  questionId: string,
): Promise<number> => {
  try {
    const deleted = await db
      .delete(screenerQuestions)
      .where(
        and(
          eq(screenerQuestions.id, questionId),
          eq(screenerQuestions.screenerId, screenerId),
        ),
      )
      .returning({ id: screenerQuestions.id });
    return deleted.length;
  } catch (error) {
    console.error("Error deleting screener question:", error);
    throw error;
  }
};

export const UpsertScreenerResponse = async ({
  dealOpportunityId,
  questionId,
  score,
  source,
  notes,
}: {
  dealOpportunityId: string;
  questionId: string;
  score: number;
  source: ScreenerResponseSource;
  notes?: string | null;
}) => {
  try {
    const [existing] = await db
      .select({ id: screenerResponses.id })
      .from(screenerResponses)
      .where(
        and(
          eq(screenerResponses.dealOpportunityId, dealOpportunityId),
          eq(screenerResponses.questionId, questionId),
          eq(screenerResponses.source, source),
        ),
      )
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(screenerResponses)
        .set({
          score,
          notes: notes ?? null,
          updatedAt: new Date(),
        })
        .where(eq(screenerResponses.id, existing.id))
        .returning();

      return updated ?? null;
    }

    const [created] = await db
      .insert(screenerResponses)
      .values({
        dealOpportunityId,
        questionId,
        score,
        source,
        notes: notes ?? null,
      })
      .returning();

    return created ?? null;
  } catch (error) {
    console.error("Error upserting screener response:", error);
    throw error;
  }
};

/**
 * Delete a reasoning by id
 * @param reasoningId - the id of the reasoning to delete
 */
export const DeleteReasoningById = async (reasoningId: string) => {
  try {
    await db.delete(aiScreenings).where(eq(aiScreenings.id, reasoningId));
  } catch (error) {
    console.error("Error deleting reasoning:", error);
    throw error;
  }
};

/**
 * Delete a baseline by id
 * @param questionnaireId - the id of the questionnaire to delete
 */
export const DeleteQuestionnaireById = async (questionnaireId: string) => {
  try {
    await db
      .delete(questionnaires)
      .where(eq(questionnaires.id, questionnaireId));
  } catch (error) {
    console.error("Error deleting questionnaire:", error);
    throw error;
  }
};

/**
 * Archive the current active CIM upload for a deal opportunity.
 */
export const archiveActiveDealCim = async (dealOpportunityId: string) => {
  await db
    .update(dealCims)
    .set({ status: "ARCHIVED" })
    .where(
      and(
        eq(dealCims.dealOpportunityId, dealOpportunityId),
        eq(dealCims.status, "ACTIVE"),
      ),
    );
};

/**
 * Create a new DealCim (active). Call archiveActiveDealCim first if replacing.
 */
export const createDealCim = async ({
  dealOpportunityId,
  documentId,
  storageKey,
  uploadedById,
}: {
  dealOpportunityId: string;
  documentId: string;
  storageKey: string;
  uploadedById?: string;
}) => {
  const [row] = await db
    .insert(dealCims)
    .values({
      dealOpportunityId,
      documentId,
      storageKey,
      status: "ACTIVE",
      uploadedById: uploadedById ?? null,
    })
    .returning();
  return row!;
};

/**
 * Replace CIM: archive current active, create new active. Returns new row.
 * Runs in a transaction to prevent race conditions.
 */
export const replaceDealCim = async ({
  dealOpportunityId,
  documentId,
  storageKey,
  uploadedById,
}: {
  dealOpportunityId: string;
  documentId: string;
  storageKey: string;
  uploadedById?: string;
}) => {
  return db.transaction(async (tx) => {
    await tx
      .update(dealCims)
      .set({ status: "ARCHIVED" })
      .where(
        and(
          eq(dealCims.dealOpportunityId, dealOpportunityId),
          eq(dealCims.status, "ACTIVE"),
        ),
      );
    const [row] = await tx
      .insert(dealCims)
      .values({
        dealOpportunityId,
        documentId,
        storageKey,
        status: "ACTIVE",
        uploadedById: uploadedById ?? null,
      })
      .returning();
    if (!row) throw new Error("Failed to create DealCim");
    return row;
  });
};

/**
 * Upsert CIM extraction for a DealCim row.
 * Uses dealCimId as the canonical link; one extraction per CIM upload.
 */
export const upsertCIMExtraction = async ({
  dealCimId,
  documentId,
  dealOpportunityId,
  payload,
  modelName,
  version,
  source = "AI",
  updatedByUserId,
}: {
  dealCimId: string;
  documentId?: string;
  dealOpportunityId?: string;
  payload: CIMExtractionPayload;
  modelName?: string;
  version?: string;
  source?: "AI" | "USER";
  updatedByUserId?: string;
}) => {
  const values = {
    dealCimId,
    documentId: documentId ?? null,
    dealOpportunityId: dealOpportunityId ?? null,
    revenueHistory: payload.revenueHistory ?? null,
    ebitdaHistory: payload.ebitdaHistory ?? null,
    employeeCount: payload.employeeCount ?? null,
    customerConcentration: payload.customerConcentration ?? null,
    capexIntensity: payload.capexIntensity ?? null,
    revenueBreakdown: payload.revenueBreakdown ?? null,
    growthDrivers: payload.growthDrivers ?? null,
    keyRisks: payload.keyRisks ?? null,
    industryOverview: payload.industryOverview ?? null,
    transactionDetails: payload.transactionDetails ?? null,
    modelName: modelName ?? null,
    version: version ?? null,
    source,
    updatedByUserId: updatedByUserId ?? null,
  };

  try {
    await db
      .insert(cimExtractions)
      .values(values)
      .onConflictDoUpdate({
        target: [cimExtractions.dealCimId],
        set: {
          documentId: values.documentId,
          dealOpportunityId: values.dealOpportunityId,
          revenueHistory: values.revenueHistory,
          ebitdaHistory: values.ebitdaHistory,
          employeeCount: values.employeeCount,
          customerConcentration: values.customerConcentration,
          capexIntensity: values.capexIntensity,
          revenueBreakdown: values.revenueBreakdown,
          growthDrivers: values.growthDrivers,
          keyRisks: values.keyRisks,
          industryOverview: values.industryOverview,
          transactionDetails: values.transactionDetails,
          modelName: values.modelName,
          version: values.version,
          source: values.source,
          updatedByUserId: values.updatedByUserId,
          updatedAt: new Date(),
        },
      });

    if (dealOpportunityId) {
      await upsertCustomerConcentrationSystemRiskFlag({
        dealOpportunityId,
        customerConcentration: payload.customerConcentration ?? null,
      });
    }
  } catch (error) {
    console.error("[upsertCIMExtraction] Failed:", error);
    throw error;
  }
};

export const createDealFinancialSnapshot = async (
  input: CreateDealFinancialSnapshotInput,
) => {
  const impliedMultiple =
    input.impliedMultiple ??
    (input.askingPrice != null && input.ebitda != null && input.ebitda !== 0
      ? input.askingPrice / input.ebitda
      : null);

  return db.transaction(async (tx) => {
    const [snapshot] = await tx
      .insert(dealFinancialSnapshots)
      .values({
        dealOpportunityId: input.dealOpportunityId,
        revenue: input.revenue ?? null,
        ebitda: input.ebitda ?? null,
        ebitdaMargin: input.ebitdaMargin ?? null,
        askingPrice: input.askingPrice ?? null,
        impliedMultiple,
        source: input.source,
        notes: input.notes ?? null,
        createdById: input.createdById ?? null,
      })
      .returning();

    await tx
      .update(dealOpportunities)
      .set({
        revenue: snapshot?.revenue ?? null,
        ebitda: snapshot?.ebitda ?? null,
        ebitdaMargin: snapshot?.ebitdaMargin ?? null,
        askingPrice: snapshot?.askingPrice ?? null,
        impliedMultiple: snapshot?.impliedMultiple ?? null,
      })
      .where(eq(dealOpportunities.id, input.dealOpportunityId));

    return snapshot ?? null;
  });
};

export const createCompanyFinancialSnapshot = async (
  input: CreateCompanyFinancialSnapshotInput,
) => {
  return db.transaction(async (tx) => {
    const [snapshot] = await tx
      .insert(companyFinancialSnapshots)
      .values({
        companyId: input.companyId,
        periodEnd: input.periodEnd,
        revenue: input.revenue ?? null,
        ebitda: input.ebitda ?? null,
        grossMargin: input.grossMargin ?? null,
        revenueCagr: input.revenueCagr ?? null,
        employees: input.employees ?? null,
        totalClients: input.totalClients ?? null,
        top10Concentration: input.top10Concentration ?? null,
        recurringRevenuePct: input.recurringRevenuePct ?? null,
        source: input.source,
        notes: input.notes ?? null,
        createdById: input.createdById ?? null,
      })
      .returning();

    if (snapshot) {
      await tx
        .update(companies)
        .set({
          revenueTtm: snapshot.revenue ?? null,
          ebitdaTtm: snapshot.ebitda ?? null,
          grossMargin: snapshot.grossMargin ?? null,
          revenueCagr: snapshot.revenueCagr ?? null,
          employees: snapshot.employees ?? null,
          totalClients: snapshot.totalClients ?? null,
          top10Concentration: snapshot.top10Concentration ?? null,
          recurringRevenuePct: snapshot.recurringRevenuePct ?? null,
        })
        .where(eq(companies.id, input.companyId));
    }

    return snapshot ?? null;
  });
};

export const createDealRiskFlag = async ({
  dealOpportunityId,
  riskType,
  severity,
  description,
  source = "USER",
  createdById,
}: {
  dealOpportunityId: string;
  riskType: DealRiskType;
  severity: DealRiskSeverity;
  description: string;
  source?: "SYSTEM" | "USER";
  createdById?: string | null;
}) => {
  const [flag] = await db
    .insert(dealRiskFlags)
    .values({
      dealOpportunityId,
      riskType,
      severity,
      description,
      source,
      createdById: createdById ?? null,
    })
    .returning();
  return flag ?? null;
};

export const upsertCustomerConcentrationSystemRiskFlag = async ({
  dealOpportunityId,
  customerConcentration,
  threshold = 40,
}: {
  dealOpportunityId: string;
  customerConcentration: number | null;
  threshold?: number;
}) => {




  if (customerConcentration == null || customerConcentration < threshold) {
    return null;
  }

  const description = `Top customer concentration is ${customerConcentration.toFixed(
    1,
  )}% (threshold: ${threshold}%).`;

  const [existing] = await db
    .select()
    .from(dealRiskFlags)
    .where(
      and(
        eq(dealRiskFlags.dealOpportunityId, dealOpportunityId),
        eq(dealRiskFlags.riskType, "CUSTOMER_CONCENTRATION"),
        eq(dealRiskFlags.source, "SYSTEM"),
      ),
    )
    .orderBy(desc(dealRiskFlags.createdAt))
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(dealRiskFlags)
      .set({
        severity: "HIGH",
        description,
      })
      .where(eq(dealRiskFlags.id, existing.id))
      .returning();
    return updated ?? null;
  }

  const [created] = await db
    .insert(dealRiskFlags)
    .values({
      dealOpportunityId,
      riskType: "CUSTOMER_CONCENTRATION",
      severity: "HIGH",
      description,
      source: "SYSTEM",
      createdById: null,
    })
    .returning();
  return created ?? null;
};

/**
 * Delete all financials (CIM extraction) for a DealCim row.
 */
export const deleteFinancialsForDealCim = async (dealCimId: string) => {
  await db
    .delete(cimExtractions)
    .where(eq(cimExtractions.dealCimId, dealCimId));
};

export type CimScreeningSessionStatus =
  | "PENDING"
  | "INGESTING"
  | "SCREENING"
  | "COMPLETED"
  | "FAILED";

export async function insertCimScreeningSession(input: {
  userId: string | null;
  documentId?: string | null;
  dealOpportunityId?: string | null;
}) {
  const docId = input.documentId?.trim() || null;
  const dealId = input.dealOpportunityId?.trim() || null;
  if ((docId ? 1 : 0) + (dealId ? 1 : 0) !== 1) {
    throw new Error(
      "insertCimScreeningSession: exactly one of documentId or dealOpportunityId is required",
    );
  }
  const [row] = await db
    .insert(cimScreeningSessions)
    .values({
      userId: input.userId,
      documentId: docId,
      dealOpportunityId: dealId,
    })
    .returning();
  return row ?? null;
}

export async function insertCimScreeningRun(input: {
  sessionId: string;
  screenerId: string;
  workflowInstanceId: string | null;
  dealDocumentsSnapshot?: unknown | null;
}) {
  const [row] = await db
    .insert(cimScreeningRuns)
    .values({
      sessionId: input.sessionId,
      screenerId: input.screenerId,
      workflowInstanceId: input.workflowInstanceId,
      status: "PENDING",
      dealDocumentsSnapshot: input.dealDocumentsSnapshot ?? null,
    })
    .returning();
  return row ?? null;
}

export async function updateCimScreeningRun(
  runId: string,
  patch: Partial<{
    status: CimScreeningSessionStatus;
    workflowInstanceId: string | null;
    errorMessage: string | null;
    dealDocumentsSnapshot: unknown | null;
  }>,
) {
  await db
    .update(cimScreeningRuns)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(cimScreeningRuns.id, runId));
}

export async function upsertCimScreeningAnswer(input: {
  runId: string;
  questionId: string;
  score: number;
  rationale: string;
  evidenceChunkIds?: string[] | null;
}) {
  await db
    .insert(cimScreeningAnswers)
    .values({
      runId: input.runId,
      questionId: input.questionId,
      score: input.score,
      rationale: input.rationale,
      evidenceChunkIds: input.evidenceChunkIds ?? null,
    })
    .onConflictDoUpdate({
      target: [cimScreeningAnswers.runId, cimScreeningAnswers.questionId],
      set: {
        score: input.score,
        rationale: input.rationale,
        evidenceChunkIds: input.evidenceChunkIds ?? null,
        updatedAt: new Date(),
      },
    });
}

export async function deleteCimScreeningAnswersForRun(runId: string) {
  await db
    .delete(cimScreeningAnswers)
    .where(eq(cimScreeningAnswers.runId, runId));
}
