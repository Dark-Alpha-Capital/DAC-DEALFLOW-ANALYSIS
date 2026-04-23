import { generateText, Output } from "ai";
import {
  buildIcScorerMemoUserPrompt,
  getOpenAIProvider,
  IC_SCORER_MEMO_SYSTEM,
} from "@repo/ai-core";
import {
  icScorerMemoPassSchema,
  type IcScorerMemoPass,
  type IcScorerScoreCore,
} from "@repo/schemas";
import { IC_SCORER_LLM_MODEL } from "./ic-scorer-score-core";

const openai = getOpenAIProvider();

export async function generateIcScorerMemoPass(input: {
  scoreCore: IcScorerScoreCore;
  evidenceSummary: string;
}): Promise<IcScorerMemoPass> {
  const userPrompt = buildIcScorerMemoUserPrompt({
    scoreJson: JSON.stringify(input.scoreCore),
    evidenceSummary: input.evidenceSummary,
  });
  const { output } = await generateText({
    model: openai(IC_SCORER_LLM_MODEL),
    system: IC_SCORER_MEMO_SYSTEM,
    prompt: userPrompt,
    output: Output.object({
      name: "IcScorerMemoPass",
      schema: icScorerMemoPassSchema,
    }),
  });
  if (!output) {
    throw new Error("IC scorer memo step produced no structured output");
  }
  return output;
}
