import { db } from ".";
import {
  deals,
  screeners,
  screenerQuestions,
  screenerResponses,
  aiScreenings,
  questionnaires,
  cimExtractions,
  dealSims,
  type ScreenerResponseSource,
} from "./schema";
import { eq, inArray, and } from "drizzle-orm";

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

export const DeleteScreenerQuestionById = async (
  screenerId: string,
  questionId: string,
) => {
  try {
    await db
      .delete(screenerQuestions)
      .where(
        and(
          eq(screenerQuestions.id, questionId),
          eq(screenerQuestions.screenerId, screenerId),
        ),
      );
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
 * Archive the current active SIM for a deal opportunity.
 */
export const archiveActiveDealSim = async (dealOpportunityId: string) => {
  await db
    .update(dealSims)
    .set({ status: "ARCHIVED" })
    .where(
      and(
        eq(dealSims.dealOpportunityId, dealOpportunityId),
        eq(dealSims.status, "ACTIVE"),
      ),
    );
};

/**
 * Create a new DealSim (active). Call archiveActiveDealSim first if replacing.
 */
export const createDealSim = async ({
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
    .insert(dealSims)
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
 * Replace SIM: archive current active, create new active. Returns new sim.
 * Runs in a transaction to prevent race conditions.
 */
export const replaceDealSim = async ({
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
      .update(dealSims)
      .set({ status: "ARCHIVED" })
      .where(
        and(
          eq(dealSims.dealOpportunityId, dealOpportunityId),
          eq(dealSims.status, "ACTIVE"),
        ),
      );
    const [row] = await tx
      .insert(dealSims)
      .values({
        dealOpportunityId,
        documentId,
        storageKey,
        status: "ACTIVE",
        uploadedById: uploadedById ?? null,
      })
      .returning();
    if (!row) throw new Error("Failed to create DealSim");
    return row;
  });
};

/**
 * Upsert CIM extraction for a SIM.
 * Uses simId as the canonical link; one extraction per SIM.
 */
export const upsertCIMExtraction = async ({
  simId,
  documentId,
  dealOpportunityId,
  payload,
  modelName,
  version,
  source = "AI",
  updatedByUserId,
}: {
  simId: string;
  documentId?: string;
  dealOpportunityId?: string;
  payload: CIMExtractionPayload;
  modelName?: string;
  version?: string;
  source?: "AI" | "USER";
  updatedByUserId?: string;
}) => {
  const values = {
    simId,
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
        target: [cimExtractions.simId],
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
  } catch (error) {
    console.error("[upsertCIMExtraction] Failed:", error);
    throw error;
  }
};

/**
 * Delete all financials (CIM extraction) for a SIM.
 */
export const deleteFinancialsForSim = async (simId: string) => {
  await db.delete(cimExtractions).where(eq(cimExtractions.simId, simId));
};
