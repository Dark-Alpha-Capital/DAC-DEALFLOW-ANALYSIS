import defaultStages from "../data/bitrix-deal-stages.json";

export type BitrixDealStageRow = { statusId: string; name: string };

function parseStagesJson(raw: string): BitrixDealStageRow[] {
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const r = row as Record<string, unknown>;
      const statusId =
        typeof r.statusId === "string"
          ? r.statusId.trim()
          : typeof r.STATUS_ID === "string"
            ? r.STATUS_ID.trim()
            : "";
      const name =
        typeof r.name === "string"
          ? r.name.trim()
          : typeof r.NAME === "string"
            ? r.NAME.trim()
            : "";
      if (!statusId) return null;
      return { statusId, name: name || statusId };
    })
    .filter((x): x is BitrixDealStageRow => x != null);
}

/** Stages for the deal pipeline UI. Populate via `bun run fetch-stages` in @repo/bitrix-sync or BITRIX_DEAL_STAGES_JSON. */
export function getBitrixDealStages(): BitrixDealStageRow[] {
  const fromEnv = process.env.BITRIX_DEAL_STAGES_JSON?.trim();
  if (fromEnv) {
    try {
      return parseStagesJson(fromEnv);
    } catch {
      return [];
    }
  }
  const fallback = defaultStages as unknown;
  if (!Array.isArray(fallback)) return [];
  return parseStagesJson(JSON.stringify(fallback));
}

const STAGE_HINTS: Record<string, string[]> = {
  LISTED: ["new deal", "duplicate", "quick deal", "teaser screening"],
  INITIAL_REVIEW: ["pre-screening", "under review"],
  SCREENED: ["screening complete", "screening review", "approval"],
  MEETING_HELD: ["management meeting", "intro call", "broker meeting"],
  IOI_SUBMITTED: ["ioi"],
  LOI_SUBMITTED: ["loi", "letter of intent"],
  DILIGENCE: ["due diligence", "dd ", "definitive"],
  CLOSED: ["closing", "deal won", "execute"],
  DEAD: ["lost", "hold", "termination", "declined", "reject"],
};

/** Pick a reasonable default Bitrix stage for the app pipeline stage (best-effort). */
export function suggestBitrixStageIdForAppStage(
  appStage: string,
  stages: BitrixDealStageRow[],
  explicitDefault?: string,
): string {
  if (explicitDefault && explicitDefault.trim()) return explicitDefault.trim();
  const hints = STAGE_HINTS[appStage] ?? [];
  const lower = stages.map((s) => ({
    ...s,
    n: s.name.toLowerCase(),
  }));
  for (const h of hints) {
    const hit = lower.find((s) => s.n.includes(h));
    if (hit) return hit.statusId;
  }
  if (stages[0]?.statusId) return stages[0].statusId;
  return "";
}
