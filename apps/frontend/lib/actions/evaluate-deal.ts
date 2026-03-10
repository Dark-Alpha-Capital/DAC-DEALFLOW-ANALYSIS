"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { generateObject } from "ai";
import { getSession } from "@/lib/auth-server";
import { openai } from "@/lib/ai/available-models";
import { rateLimit } from "@/lib/redis";
import db, { deals, eq } from "@repo/db";
import { getScreenerWithQuestions } from "@repo/db/queries";

export async function evaluateDeal(dealId: string, screenerId: string) {
  const userSession = await getSession();

  if (!userSession) {
    return {
      success: false,
      error: "Unauthorized",
    };
  }

  const ip =
    (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
  const { ok } = await rateLimit(
    `api:evaluate-deal:${ip}`,
    10,
    60_000,
  );

  if (!ok) {
    return {
      success: false,
      message: "Too many requests",
    };
  }

  const [deal] = await db
    .select({
      id: deals.id,
      title: deals.title,
      dealCaption: deals.dealCaption,
      dealTeaser: deals.dealTeaser,
      askingPrice: deals.askingPrice,
      dealType: deals.dealType,
      grossRevenue: deals.grossRevenue,
      tags: deals.tags,
      brokerage: deals.brokerage,
      ebitdaMargin: deals.ebitdaMargin,
      ebitda: deals.ebitda,
      revenue: deals.revenue,
    })
    .from(deals)
    .where(eq(deals.id, dealId))
    .limit(1);

  if (!deal) {
    return {
      success: false,
      error: "Deal not found",
    };
  }

  const screener = await getScreenerWithQuestions(screenerId);
  if (!screener || screener.questions.length === 0) {
    return {
      success: false,
      error: "Screener not found or has no questions",
    };
  }

  try {
    const evaluation = await generateObject({
      model: openai("gpt-4o-mini"),
      prompt: `Evaluate this deal against the structured screener below.

Deal:
${JSON.stringify(deal, null, 2)}

Screener:
${JSON.stringify(
  {
    id: screener.id,
    name: screener.name,
    category: screener.category,
    description: screener.description,
    questions: screener.questions.map((question) => ({
      questionId: question.id,
      question: question.question,
      weight: question.weight,
      responseType: question.responseType,
    })),
  },
  null,
  2,
)}

Instructions:
- Score every question on a 0-10 integer scale.
- Use only the deal information provided.
- Return concise notes for each question.
- Also return an overall title, weighted score, sentiment, and explanation.`,
      schema: z.object({
        title: z.string(),
        score: z.number().min(0).max(10),
        sentiment: z.enum(["POSITIVE", "NEGATIVE", "NEUTRAL"]),
        explanation: z.string(),
        responses: z.array(
          z.object({
            questionId: z.string(),
            score: z.number().int().min(0).max(10),
            notes: z.string(),
          }),
        ),
      }),
    });

    const responseByQuestionId = new Map(
      evaluation.object.responses.map((response) => [
        response.questionId,
        response,
      ]),
    );

    return {
      success: true,
      title: evaluation.object.title,
      score: evaluation.object.score,
      sentiment: evaluation.object.sentiment,
      explanation: evaluation.object.explanation,
      responses: screener.questions.map((question) => {
        const response = responseByQuestionId.get(question.id);

        return {
          questionId: question.id,
          question: question.question,
          weight: question.weight,
          score: response?.score ?? 0,
          notes: response?.notes ?? "No supporting detail returned.",
        };
      }),
    };
  } catch (error) {
    console.error("Error evaluating deal:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
