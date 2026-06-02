import {
  screeners,
  screenerQuestions,
  screenerResponses,
  aiScreenings,
} from "../schema";
import { db } from "../index";
import {
  eq,
  and,
  asc,
  desc,
  sql,
} from "drizzle-orm";
import { GetDealOpportunityByLegacyDealId } from "./deal-opportunity";

/**
 * Get all screeners
 * @returns all screeners
 */
export async function getAllScreeners() {
  try {
    return await db
      .select({
        id: screeners.id,
        name: screeners.name,
        category: screeners.category,
        description: screeners.description,
        department: screeners.department,
        createdAt: screeners.createdAt,
        updatedAt: screeners.updatedAt,
        questionCount: sql<number>`count(${screenerQuestions.id})`
          .mapWith(Number)
          .as("questionCount"),
        totalWeight: sql<number>`coalesce(sum(${screenerQuestions.weight}), 0)`
          .mapWith(Number)
          .as("totalWeight"),
      })
      .from(screeners)
      .leftJoin(
        screenerQuestions,
        eq(screenerQuestions.screenerId, screeners.id),
      )
      .groupBy(
        screeners.id,
        screeners.name,
        screeners.category,
        screeners.description,
        screeners.department,
        screeners.createdAt,
        screeners.updatedAt,
      )
      .orderBy(asc(screeners.name));
  } catch (error) {
    console.error("Error fetching all screeners", error);
    return null;
  }
}

/**
 * Get all screeners
 * @returns all screeners
 */
export async function getAllScreenersWithContent() {
  return getAllScreeners();
}

export async function getScreenerById(screenerId: string) {
  try {
    const [row] = await db
      .select({
        id: screeners.id,
        name: screeners.name,
        category: screeners.category,
        description: screeners.description,
        content: screeners.content,
        department: screeners.department,
        createdAt: screeners.createdAt,
        updatedAt: screeners.updatedAt,
      })
      .from(screeners)
      .where(eq(screeners.id, screenerId))
      .limit(1);

    return row ?? null;
  } catch (error) {
    console.error("Error fetching screener by id", error);
    return null;
  }
}

export async function getScreenerQuestions(screenerId: string) {
  try {
    return await db
      .select({
        id: screenerQuestions.id,
        screenerId: screenerQuestions.screenerId,
        question: screenerQuestions.question,
        weight: screenerQuestions.weight,
        responseType: screenerQuestions.responseType,
        position: screenerQuestions.position,
        createdAt: screenerQuestions.createdAt,
        updatedAt: screenerQuestions.updatedAt,
      })
      .from(screenerQuestions)
      .where(eq(screenerQuestions.screenerId, screenerId))
      .orderBy(
        asc(screenerQuestions.position),
        asc(screenerQuestions.createdAt),
      );
  } catch (error) {
    console.error("Error fetching screener questions", error);
    return [];
  }
}

export async function getScreenerWithQuestions(screenerId: string) {
  const [screener, questions] = await Promise.all([
    getScreenerById(screenerId),
    getScreenerQuestions(screenerId),
  ]);

  if (!screener) {
    return null;
  }

  return {
    ...screener,
    questions,
  };
}

export async function getScreenerResponsesByDealOpportunityId(
  dealOpportunityId: string,
  screenerId: string,
) {
  try {
    const [questions, responses] = await Promise.all([
      getScreenerQuestions(screenerId),
      db
        .select({
          id: screenerResponses.id,
          dealOpportunityId: screenerResponses.dealOpportunityId,
          questionId: screenerResponses.questionId,
          score: screenerResponses.score,
          source: screenerResponses.source,
          notes: screenerResponses.notes,
          createdAt: screenerResponses.createdAt,
          updatedAt: screenerResponses.updatedAt,
        })
        .from(screenerResponses)
        .innerJoin(
          screenerQuestions,
          eq(screenerQuestions.id, screenerResponses.questionId),
        )
        .where(
          and(
            eq(screenerResponses.dealOpportunityId, dealOpportunityId),
            eq(screenerQuestions.screenerId, screenerId),
          ),
        ),
    ]);

    const responseMap = new Map(
      responses.map((response) => [
        `${response.questionId}:${response.source}`,
        response,
      ]),
    );

    return questions.map((question) => ({
      ...question,
      aiResponse: responseMap.get(`${question.id}:AI`) ?? null,
      humanResponse: responseMap.get(`${question.id}:HUMAN`) ?? null,
    }));
  } catch (error) {
    console.error("Error fetching screener responses", error);
    return [];
  }
}

/**
 * Get all deal reasonings with screener name (by dealOpportunityId)
 */
export async function getAllDealReasoningsWithScreenerNameByOpportunityId(
  dealOpportunityId: string,
) {
  try {
    const results = await db
      .select({
        id: aiScreenings.id,
        title: aiScreenings.title,
        sentiment: aiScreenings.sentiment,
        score: aiScreenings.score,
        explanation: aiScreenings.explanation,
        createdAt: aiScreenings.createdAt,
        updatedAt: aiScreenings.updatedAt,
        screener: {
          id: screeners.id,
          name: screeners.name,
        },
      })
      .from(aiScreenings)
      .leftJoin(screeners, eq(aiScreenings.screenerId, screeners.id))
      .where(eq(aiScreenings.dealOpportunityId, dealOpportunityId))
      .orderBy(desc(aiScreenings.createdAt));

    return results.map((r) => ({
      ...r,
      screener: r.screener?.id ? r.screener : null,
    }));
  } catch (error) {
    console.error(
      "Error fetching all deal reasonings with screener name",
      error,
    );
    return null;
  }
}

/**
 * Get all deal reasonings - resolves legacy dealId to dealOpportunityId first
 */
export async function getAllDealReasoningsWithScreenerName(dealId: string) {
  const opp = await GetDealOpportunityByLegacyDealId(dealId);
  if (!opp) return null;
  return getAllDealReasoningsWithScreenerNameByOpportunityId(opp.id);
}

/**
 * Get a complete ai reasoning by id
 * @param reasoningId - the id of the reasoning
 * @returns the complete ai reasoning
 */
export async function getCompleteAiReasoningById(reasoningId: string) {
  try {
    const [result] = await db
      .select({
        id: aiScreenings.id,
        title: aiScreenings.title,
        sentiment: aiScreenings.sentiment,
        score: aiScreenings.score,
        content: aiScreenings.content,
        explanation: aiScreenings.explanation,
        createdAt: aiScreenings.createdAt,
        updatedAt: aiScreenings.updatedAt,
        screener: {
          id: screeners.id,
          name: screeners.name,
        },
      })
      .from(aiScreenings)
      .leftJoin(screeners, eq(aiScreenings.screenerId, screeners.id))
      .where(eq(aiScreenings.id, reasoningId));

    if (!result) return null;

    return {
      ...result,
      screener: result.screener?.id ? result.screener : null,
    };
  } catch (error) {
    console.log(error);
    return null;
  }
}

export const getFirstThreeDealAIScreenings = async (dealId: string) => {
  const opp = await GetDealOpportunityByLegacyDealId(dealId);
  if (!opp) return [];
  try {
    return await db
      .select()
      .from(aiScreenings)
      .where(eq(aiScreenings.dealOpportunityId, opp.id))
      .orderBy(desc(aiScreenings.createdAt))
      .limit(3);
  } catch (error) {
    console.error("Error fetching deal ai screenings", error);
    throw error;
  }
};

