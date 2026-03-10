import { db } from ".";
import {
  deals,
  screeners,
  screenerQuestions,
  screenerResponses,
  aiScreenings,
  questionnaires,
  type ScreenerResponseSource,
} from "./schema";
import { eq, inArray, and } from "drizzle-orm";

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
