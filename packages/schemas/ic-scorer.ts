import { z } from "zod";

/**
 * OpenAI structured-output mode requires every property to be `required`.
 * Use `.nullable()` instead of `.optional()` so keys are always present.
 */

export const icScorerColorSchema = z.enum(["green", "yellow", "red"]);
export type IcScorerColor = z.infer<typeof icScorerColorSchema>;

export const icScorerAlignmentStatusSchema = z.enum(["pass", "partial", "fail"]);
export type IcScorerAlignmentStatus = z.infer<
  typeof icScorerAlignmentStatusSchema
>;

export const icScorerAlignmentRowSchema = z.object({
  pillar: z
    .string()
    .describe(
      "Short pillar name, e.g. 'Financials', 'Industry', 'Business quality', 'Management', 'Value creation', 'Deal context'.",
    ),
  status: icScorerAlignmentStatusSchema.describe(
    "pass = meets Dark Alpha criterion; partial = partially meets / some data gaps; fail = misses the criterion.",
  ),
  note: z
    .string()
    .describe(
      "One sentence with the concrete evidence (or lack thereof) from the deal data.",
    ),
});
export type IcScorerAlignmentRow = z.infer<typeof icScorerAlignmentRowSchema>;

export const icScorerRiskRowSchema = z.object({
  risk: z.string().describe("The risk or data gap in plain language."),
  suggestedAction: z
    .string()
    .describe(
      "Concrete follow-up the deal team should take (e.g. 'Ask broker for customer concentration breakdown').",
    ),
});
export type IcScorerRiskRow = z.infer<typeof icScorerRiskRowSchema>;

const icScorerScoreFieldsSchema = z.object({
  score: z
    .number()
    .min(0)
    .max(100)
    .describe("IC readiness score from 0 to 100."),
  color: icScorerColorSchema.describe(
    "Green 80+, Yellow 60–79, Red <60. Must align with the numeric score.",
  ),
  headline: z
    .string()
    .describe(
      "Single-sentence verdict, e.g. 'Strong fit; minor data gaps on customer concentration.'",
    ),
  investmentThesis: z
    .string()
    .describe(
      "One paragraph — pull or enhance the thesis from the deal data; cite evidence. If missing, say so and infer cautiously.",
    ),
  alignment: z
    .array(icScorerAlignmentRowSchema)
    .describe(
      "Alignment with Dark Alpha criteria pillars — at minimum Financials, Industry, Business, Management, Value creation, Deal context.",
    ),
  strengths: z
    .array(z.string())
    .describe("Bulleted strengths tied to evidence in the deal record."),
  risksAndGaps: z
    .array(icScorerRiskRowSchema)
    .describe("Risks and data gaps with a concrete suggested action for each."),
  recommendation: z
    .string()
    .describe(
      "Final recommendation: 'Ready for IC', 'Ready for IC with follow-ups', 'Not yet IC-ready', or 'Do not present'.",
    ),
  missingFields: z
    .array(z.string())
    .describe(
      "Specific Bitrix fields or indexed documents that, if populated, would improve the score.",
    ),
  promptVersion: z
    .string()
    .describe("Echo back the PROMPT_VERSION string provided in the system message."),
});

/** Pass 1 structured output (no memo pass fields). */
export const icScorerScoreCoreSchema = icScorerScoreFieldsSchema;
export type IcScorerScoreCore = z.infer<typeof icScorerScoreCoreSchema>;

/**
 * Pass 2: IC-facing memo as plain structured text (no HTML).
 * UI or Bitrix post step can format this into comments, PDF, etc.
 */
export const icScorerMemoStructuredSchema = z.object({
  scoreHeadline: z
    .string()
    .describe(
      "One line: score /100, color band in words, and verdict echoing the core headline.",
    ),
  investmentThesisMemo: z
    .string()
    .describe(
      "1–3 short paragraphs, plain text only; must align with core investmentThesis.",
    ),
  alignmentMemos: z
    .array(
      z.object({
        pillar: z.string(),
        memo: z
          .string()
          .describe(
            "Plain sentences for this pillar; must match core alignment status and note.",
          ),
      }),
    )
    .describe(
      "One entry per row in core alignment, same pillars and order as in the score JSON.",
    ),
  strengthBullets: z
    .array(z.string())
    .describe("Memo-ready bullets echoing core strengths; plain text."),
  riskAndGapsMemo: z
    .array(
      z.object({
        risk: z.string(),
        suggestedAction: z.string(),
      }),
    )
    .describe("Echo core risksAndGaps; plain text only."),
  recommendationMemo: z
    .string()
    .describe("Plain paragraph echoing core recommendation."),
});

export type IcScorerMemoStructured = z.infer<typeof icScorerMemoStructuredSchema>;

/** Pass 2 LLM output (structured memo + prompt version echo). */
export const icScorerMemoPassSchema = z.object({
  memo: icScorerMemoStructuredSchema,
  promptVersion: z
    .string()
    .describe("Echo back the PROMPT_VERSION string from the memo system message."),
});

export type IcScorerMemoPass = z.infer<typeof icScorerMemoPassSchema>;

/** Completed run payload (score + memo pass). */
export const icScorerOutputSchema = icScorerScoreFieldsSchema.extend({
  memo: icScorerMemoStructuredSchema,
});

export type IcScorerOutput = z.infer<typeof icScorerOutputSchema>;

/**
 * Persisted row shape: new runs use `memo`; legacy runs may only have `memoHtml`.
 */
export const icScorerOutputLooseSchema = icScorerScoreFieldsSchema.extend({
  memo: icScorerMemoStructuredSchema.optional(),
  memoHtml: z.string().optional(),
});

export type IcScorerOutputLoose = z.infer<typeof icScorerOutputLooseSchema>;

export function mergeIcScorerOutput(
  core: IcScorerScoreCore,
  memo: IcScorerMemoPass,
): IcScorerOutput {
  return { ...core, memo: memo.memo, promptVersion: memo.promptVersion };
}

/** Plain-text timeline body for Bitrix (or copy); newline-separated sections. */
export function formatIcScorerMemoPlainText(m: IcScorerMemoStructured): string {
  return [
    "IC READINESS",
    m.scoreHeadline.trim(),
    "",
    "Investment thesis",
    m.investmentThesisMemo.trim(),
    "",
    "Alignment",
    ...m.alignmentMemos.map((row) => `• ${row.pillar}: ${row.memo.trim()}`),
    "",
    "Strengths",
    ...m.strengthBullets.map((s) => `• ${s.trim()}`),
    "",
    "Risks & gaps",
    ...m.riskAndGapsMemo.map(
      (r) =>
        `• ${r.risk.trim()}${r.suggestedAction.trim() ? ` — ${r.suggestedAction.trim()}` : ""}`,
    ),
    "",
    "Recommendation",
    m.recommendationMemo.trim(),
  ].join("\n");
}
