import { DARK_ALPHA_CRITERIA } from "./dark-alpha-criteria";

/**
 * Bump when the prompt contract changes so the LLM can echo it into the output
 * and the UI can detect drift / stale cached memos.
 */
export const IC_SCORER_PROMPT_VERSION = "ic-scorer/v3-memo-structured";

const CRITERIA_BLOCK = `---
${DARK_ALPHA_CRITERIA}
---`;

/** Pass 1: score + narrative fields only (no memo HTML). */
export const IC_SCORER_SCORE_SYSTEM = `# Identity

You are a senior private-equity deal-screening analyst for Dark Alpha Capital. Your job is to decide whether a specific deal is ready to be presented to Dark Alpha's Investment Committee (IC), based on structured CRM fields and indexed document excerpts.

# Criteria (source of truth)

Use only the criteria below when scoring. Do not invent firm policy or criteria beyond what is stated here. When the deal record is missing data that the criteria need, lower the score proportionally and add the missing item to \`missingFields\`.

${CRITERIA_BLOCK}

# Instructions

- Score from 0 to 100 using the rubric above. Map the color: Green 80+, Yellow 60–79, Red below 60.
- Evaluate every pillar (Financials, Industry, Business quality, Management, Value creation, Deal context). Always include each pillar as a row in \`alignment\`, even if the status is "fail" because data is missing.
- Ground every strength, risk, and alignment note in specific CRM field values or **indexed excerpts** from the user message. If you cite a number, it must appear in the input. Do not fabricate financials.
- When data is incomplete, say so. Lower the score, populate \`missingFields\` with specific labels (use field labels from the structured section), and add a suggested action in \`risksAndGaps\` for how the deal team can close the gap.
- \`recommendation\` must be one of: "Ready for IC", "Ready for IC with follow-ups", "Not yet IC-ready", "Do not present".
- Do **not** produce HTML — a second pass will draft structured plain-text memo fields from your JSON.
- Set \`promptVersion\` to exactly: ${IC_SCORER_PROMPT_VERSION}

# Style

Professional, concise, evidence-first. No hedging filler ("it seems", "potentially"). Prefer short declarative sentences. Write in US English.`;

/** Pass 2: structured plain-text memo (no HTML); UI formats for display / Bitrix later. */
export const IC_SCORER_MEMO_SYSTEM = `# Identity

You produce an IC readiness **memo as plain structured fields**. The score and analysis are already fixed in JSON from pass 1 — your job is to rewrite them into memo-ready prose that matches that JSON exactly (no new facts, no contradictions).

# Instructions

- Output only \`memo\` (nested object) and \`promptVersion\` in the structured format requested.
- **No HTML, no Markdown**, no angle brackets — only plain UTF-8 text in every string field.
- \`memo.scoreHeadline\`: one line with score /100, color band in words (green / yellow / red), and the verdict echoing \`headline\`.
- \`memo.investmentThesisMemo\`: 1–3 short paragraphs from \`investmentThesis\`.
- \`memo.alignmentMemos\`: one object per row in \`alignment\`, same \`pillar\` strings and order; \`memo\` is plain prose reflecting that row's \`status\` and \`note\`.
- \`memo.strengthBullets\`: one string per item in \`strengths\`, tightened for a memo.
- \`memo.riskAndGapsMemo\`: one object per item in \`risksAndGaps\`, same risks and suggested actions in plain text.
- \`memo.recommendationMemo\`: one paragraph from \`recommendation\`.
- Set \`promptVersion\` to exactly: ${IC_SCORER_PROMPT_VERSION}

# Style

Professional, concise. US English.`;

type BitrixFieldCatalogRow = {
  fieldId: string;
  title: string | null;
  type: string | null;
};

export type IcScorerEvidenceExcerpt = {
  /** Human-readable label, e.g. chunk id + doc hint */
  label: string;
  chunkId?: string;
  documentId?: string;
  text: string;
};

export type IcScorerPromptInput = {
  dealId: string;
  deal: Record<string, unknown>;
  fieldCatalogRows: BitrixFieldCatalogRow[];
  evidenceExcerpts: IcScorerEvidenceExcerpt[];
  /** Optional Bitrix widget listing dump (same source as CIM screening widget). */
  dealListingContext?: string;
};

const EXCERPT_CHAR_BUDGET = 80_000;
const PER_EXCERPT_CHAR_CAP = 24_000;

function serializeFieldValue(value: unknown): string {
  if (value == null || value === "") return "";
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value).trim();
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/**
 * User message for pass 1: CRM snapshot + indexed chunk excerpts (bounded).
 */
export function buildIcScorerUserPrompt(input: IcScorerPromptInput): string {
  const metaById = new Map(
    input.fieldCatalogRows.map((r) => [r.fieldId, r] as const),
  );

  const coreKeys = [
    "ID",
    "TITLE",
    "STAGE_ID",
    "CURRENCY_ID",
    "OPPORTUNITY",
    "COMMENTS",
    "UF_CRM_DEAL_DESCRIPTION",
  ];

  const fieldLines: string[] = [];
  for (const key of Object.keys(input.deal)) {
    if (key === "undefined") continue;
    const meta = metaById.get(key);
    const type = (meta?.type ?? "").toLowerCase();
    if (type.includes("file") || type.includes("disk")) continue;
    const title = meta?.title?.trim();
    const label = title && title !== key ? `${title} (${key})` : key;
    const serialized = serializeFieldValue(input.deal[key]);
    if (!serialized) continue;
    const isCore = coreKeys.includes(key);
    fieldLines.push(
      `${isCore ? "* " : "- "}${label}: ${serialized.slice(0, 2_000)}`,
    );
  }
  fieldLines.sort((a, b) =>
    a.startsWith("* ") === b.startsWith("* ") ? a.localeCompare(b) : a.startsWith("* ") ? -1 : 1,
  );

  const excerptSections: string[] = [];
  let budgetLeft = EXCERPT_CHAR_BUDGET;
  for (const ex of input.evidenceExcerpts) {
    const text = ex.text?.trim() ?? "";
    if (!text) continue;
    const allowance = Math.min(PER_EXCERPT_CHAR_CAP, budgetLeft);
    if (allowance <= 0) {
      excerptSections.push(
        `### ${ex.label}\n[omitted: excerpt budget exhausted]`,
      );
      continue;
    }
    const sliced = text.slice(0, allowance);
    const truncated = sliced.length < text.length;
    budgetLeft -= sliced.length;
    const idNote = [ex.chunkId ? `chunk=${ex.chunkId}` : null, ex.documentId ? `doc=${ex.documentId}` : null]
      .filter(Boolean)
      .join(" ");
    excerptSections.push(
      `### ${ex.label}${idNote ? ` (${idNote})` : ""}${truncated ? " (truncated)" : ""}\n${sliced}`,
    );
  }

  const listing = input.dealListingContext?.trim();
  const listingBlock = listing
    ? `\n\n## Live deal listing (Bitrix snapshot)\n${listing.slice(0, 50_000)}`
    : "";

  return `Deal to evaluate (Bitrix24 deal id ${input.dealId}):

## Structured CRM fields
${fieldLines.length > 0 ? fieldLines.join("\n") : "(no fields returned by Bitrix)"}

## Indexed deal document excerpts (Postgres chunks)
${excerptSections.length > 0 ? excerptSections.join("\n\n") : "(no excerpts — score conservatively and list gaps)"}
${listingBlock}

Produce the structured JSON score object as instructed in the system prompt. Echo promptVersion = ${IC_SCORER_PROMPT_VERSION}.`;

}

export function buildIcScorerMemoUserPrompt(input: {
  scoreJson: string;
  evidenceSummary: string;
}): string {
  return `## Score JSON (source of truth — memo fields must match this)\n${input.scoreJson}\n\n## Short evidence summary (for tone only; do not invent facts beyond the JSON)\n${input.evidenceSummary}\n\nFill the structured \`memo\` object per the system instructions. Echo promptVersion = ${IC_SCORER_PROMPT_VERSION}.`;
}

/** @deprecated Use IC_SCORER_SCORE_SYSTEM + buildIcScorerUserPrompt with evidenceExcerpts. */
export const IC_SCORER_SYSTEM = IC_SCORER_SCORE_SYSTEM;
