import { z } from "zod";

const BITRIX_SCREENING_COMMENT_MAX_CHARS = 62_000;

export const CIM_SCREENING_MODEL =
  process.env.CIM_SCREENING_MODEL?.trim() || "gpt-5.1";

export const SCREENING_ANSWER_SCHEMA = z.object({
  score: z.number().min(0).max(10),
  rationale: z.string().max(500),
});

export function getInterQuestionDelayMs(
  envVarName: string,
  fallbackMs = 350,
): number {
  const raw = process.env[envVarName]?.trim();
  if (!raw) return fallbackMs;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return fallbackMs;
  return Math.min(30_000, n);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function buildExcerptsFromHits(
  textHits: { chunkText: string | null }[],
): string {
  if (textHits.length === 0) {
    return "No text excerpts were retrieved for this question.";
  }
  return textHits
    .map((h, idx) => `[Excerpt ${idx + 1}]\n${h.chunkText!.trim()}`)
    .join("\n\n");
}

function screeningBandFromAverage(
  avgScore: number | null,
): "INCOMPLETE" | "PASS" | "FAIL" {
  if (avgScore == null) return "INCOMPLETE";
  if (avgScore >= 7) return "PASS";
  if (avgScore >= 4) return "INCOMPLETE";
  return "FAIL";
}

function compactTimelineRationale(value: string | null | undefined): string {
  const text = value?.trim();
  if (!text) return "—";
  const firstSentence = text.match(/^[\s\S]*?[.!?](?:\s|$)/)?.[0]?.trim();
  const compact = firstSentence || text;
  return compact.length <= 240 ? compact : `${compact.slice(0, 237).trim()}...`;
}

export function buildBitrixTimelineCommentText(input: {
  runId: string;
  screenerId: string;
  sessionId: string;
  qaRows: Array<{
    score: number | null;
    questionText: string | null;
    rationale: string | null;
  }>;
}): { comment: string; truncated: boolean } {
  const scores = input.qaRows
    .map((r) => r.score)
    .filter((s): s is number => s != null);
  const avgScore =
    scores.length > 0
      ? scores.reduce((sum, a) => sum + a, 0) / scores.length
      : null;
  const status = screeningBandFromAverage(avgScore);

  const qaBody = input.qaRows
    .map((row, i) => {
      const q = row.questionText?.trim() || "(question)";
      const rationale = compactTimelineRationale(row.rationale);
      return [`${i + 1}. ${q}`, `   Score: ${row.score ?? "—"}/10`, "", rationale].join(
        "\n",
      );
    })
    .join("\n\n---\n\n");

  const header = [
    "AI CIM screening completed",
    `Run ID: ${input.runId}`,
    `Screener ID: ${input.screenerId}`,
    avgScore == null
      ? null
      : `Average score: ${avgScore.toFixed(1)}/10 (${status})`,
    `App session: /screening/${input.sessionId}`,
    "",
    "Questions and answers:",
    "",
  ]
    .filter(Boolean)
    .join("\n");

  const full = `${header}${qaBody}`;
  const tail =
    "\n\n[Truncated: comment exceeded maximum length for Bitrix timeline]";
  if (full.length <= BITRIX_SCREENING_COMMENT_MAX_CHARS) {
    return { comment: full, truncated: false };
  }
  const maxBody = BITRIX_SCREENING_COMMENT_MAX_CHARS - tail.length;
  return { comment: full.slice(0, maxBody) + tail, truncated: true };
}
