import { AI_DEAL_SCREENING_INSTRUCTIONS } from "@repo/ai-core";
import { openaiClient } from "../available-models";
import z from "zod";
import { zodTextFormat } from "openai/helpers/zod";

const DealScreeningResult = z.object({
  score: z
    .number()
    .describe("Numerical score from 1-10, where 10 is excellent"),
  title: z.string().describe("Brief, descriptive title summarizing the deal"),

  explanation: z
    .string()
    .describe(
      "Detailed analysis of the deal's strengths, weaknesses, and alignment with criteria"
    ),
  sentiment: z
    .enum(["POSITIVE", "NEUTRAL", "NEGATIVE"])
    .describe("Overall sentiment of the deal"),
  optionalContent: z
    .string()
    .describe("Additional insights, risks, opportunities, or recommendations")
    .optional(),
});

/**
 *
 * performs ai screening by taking the deal information and passing it through a model that compares it to its vector store
 *
 * @param dealInfo
 * @returns
 */
export async function doAIDealScreening(dealInfo: string) {
  try {
    const response = await openaiClient.responses.create({
      model: "gpt-4o",
      instructions: AI_DEAL_SCREENING_INSTRUCTIONS,
      input: `Can you please evaluate deal ${dealInfo}`,
      tools: [
        {
          type: "file_search",
          vector_store_ids: ["vs_J6ChDdA5z2j0fJKtmoOQnohz"],
          max_num_results: 20,
        },
      ],
      include: ["file_search_call.results"],
    });

    console.log(response.output_text);
    return {
      success: true,
      message: "successfully screened deal",
      result: response.output_text,
    };
  } catch (error) {
    console.error("Error in doAIDealScreening", error);
    return {
      success: false,
      message: "Error screening deal",
    };
  }
}
