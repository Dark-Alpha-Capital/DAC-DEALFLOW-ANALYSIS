import { generateText } from "ai";
import { splitContentIntoChunks } from "../utils";
import { openai } from "../ai/available-models";
import { z } from "zod";
import { generateObject } from "ai";
import db, { Sentiment, deals, screeners, aiScreenings, eq } from "db";

/**
 * Progress callback type for tracking job progress
 */
export type ProgressCallback = (step: string, percentage: number) => Promise<void>;

/**
 * Evaluates a deal against a screener
 * @param dealId - The ID of the deal to evaluate
 * @param screenerId - The ID of the screener to use for evaluation
 * @param onProgress - Optional callback to report progress
 * @returns The evaluation result
 */
export async function evaluateDealAndSaveResult(
  dealId: string,
  screenerId: string,
  onProgress?: ProgressCallback
) {
  // Report initial progress
  await onProgress?.("Fetching deal information", 5);

  const [fetchedDealInformation] = await db
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
    .where(eq(deals.id, dealId));

  if (!fetchedDealInformation) {
    return {
      success: false,
      error: "Deal not found",
    };
  }

  try {
    // Report progress for fetching screener
    await onProgress?.("Fetching screener", 10);

    const [screener] = await db
      .select()
      .from(screeners)
      .where(eq(screeners.id, screenerId));

    if (!screener) {
      return {
        success: false,
        error: "Screener not found",
      };
    }

    // Report progress for splitting content
    await onProgress?.("Splitting content into chunks", 15);

    const chunks = await splitContentIntoChunks(screener.content);
    const totalChunks = chunks.length;
    console.log("total chunks", totalChunks);

    const intermediateSummaries = [];

    // Process each chunk with progress updates
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      // Calculate percentage: 15% (start) to 75% (end of chunk processing)
      const chunkPercentage = 15 + Math.round(((i + 1) / totalChunks) * 60);
      await onProgress?.(`Processing chunk ${i + 1}/${totalChunks}`, chunkPercentage);

      const summary = await generateText({
        model: openai("gpt-4o-mini"),
        prompt: `Evaluate this listing ${JSON.stringify(
          fetchedDealInformation
        )}: ${chunk}`,
      });
      console.log("pushing chunk evaluation", summary.text);
      intermediateSummaries.push(summary.text);
    }
    const combinedSummary = intermediateSummaries.join(
      "\n\n=== Next Section ===\n\n"
    );

    console.log(combinedSummary);

    // Report progress for generating final summary
    await onProgress?.("Generating final summary", 80);

    let finalSummary;

    try {
      finalSummary = await generateObject({
        model: openai("gpt-4o-mini"),
        prompt: `Combine the following summaries into a single summary: ${combinedSummary}`,
        schema: z.object({
          title: z.string(),
          score: z.number(),
          sentiment: z.enum(["POSITIVE", "NEGATIVE", "NEUTRAL"]),
          explanation: z.string(),
        }),
      });
    } catch (error) {
      console.log(error);
      return {
        success: false,
        message: "Error generating summary",
      };
    }

    let evaluation = finalSummary.object;

    console.log("evaluation", evaluation);

    let sentiment: typeof Sentiment[keyof typeof Sentiment] = Sentiment.NEUTRAL;
    if (evaluation.sentiment) {
      switch (evaluation.sentiment) {
        case "POSITIVE":
          sentiment = Sentiment.POSITIVE;
          break;
        case "NEGATIVE":
          sentiment = Sentiment.NEGATIVE;
          break;
        case "NEUTRAL":
        default:
          sentiment = Sentiment.NEUTRAL;
          break;
      }
    }

    // Report progress for saving results
    await onProgress?.("Saving results to database", 95);

    // Create the AI screening record
    const [savedEvaluation] = await db
      .insert(aiScreenings)
      .values({
        dealId,
        title: evaluation.title,
        explanation: evaluation.explanation,
        score: evaluation.score ? Math.round(evaluation.score) : null,
        content: combinedSummary,
        sentiment,
        screenerId,
      })
      .returning();

    if (!savedEvaluation) {
      return {
        success: false,
        message: "Failed to save evaluation",
      };
    }

    return {
      success: true,
      message: "Evaluation saved successfully",
      evaluationId: savedEvaluation.id,
      data: savedEvaluation,
    };
  } catch (error) {
    console.error("Error evaluating deal and saving result:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
