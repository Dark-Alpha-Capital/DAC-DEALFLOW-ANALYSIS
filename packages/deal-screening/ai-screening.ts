import { generateText, Output } from "ai";
import { z } from "zod";
import {
  getOpenAIProvider,
  QUALITATIVE_SCREENING_PROMPT,
} from "@repo/ai-core";

export { QUALITATIVE_SCREENING_PROMPT } from "@repo/ai-core";

export const qualitativeScreeningOutputSchema = z.object({
  revenuePredictability: z.number().min(1).max(5),
  marketGrowth: z.number().min(1).max(5),
  competitiveAdvantage: z.number().min(1).max(5),
  keyRisks: z.number().min(1).max(5),
  explanation: z.string(),
});

export type QualitativeScreeningResult = z.infer<
  typeof qualitativeScreeningOutputSchema
>;

const openai = getOpenAIProvider();

export async function runAiQualitativeScreening(
  dealDescription: string,
): Promise<QualitativeScreeningResult> {
  const { output } = await generateText({
    model: openai("gpt-4o-mini"),
    prompt: `${QUALITATIVE_SCREENING_PROMPT}\n\nDeal description:\n${dealDescription}`,
    output: Output.object({
      schema: qualitativeScreeningOutputSchema,
    }),
  });
  if (!output) {
    throw new Error("AI screening produced no output");
  }

  return output;
}
