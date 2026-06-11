import { generateText, Output } from "ai";
import {
  getOpenAIProvider,
  IC_SCORER_SCORE_SYSTEM,
} from "@repo/ai-core";
import { icScorerScoreCoreSchema, type IcScorerScoreCore } from "@repo/schemas";

export const IC_SCORER_LLM_MODEL =
  process.env.IC_SCORER_MODEL?.trim() || "gpt-4.1-mini";

export async function generateIcScorerScoreCore(
  userPrompt: string,
): Promise<IcScorerScoreCore> {
  const { output } = await generateText({
    model: getOpenAIProvider()(IC_SCORER_LLM_MODEL),
    system: IC_SCORER_SCORE_SYSTEM,
    prompt: userPrompt,
    output: Output.object({
      name: "IcScorerScoreCore",
      schema: icScorerScoreCoreSchema,
    }),
  });
  if (!output) {
    throw new Error("IC scorer score step produced no structured output");
  }
  return output;
}
