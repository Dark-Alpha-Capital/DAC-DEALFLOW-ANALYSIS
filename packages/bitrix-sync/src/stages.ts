import defaultStages from "../data/bitrix-deal-stages.json";
import { BITRIX_DEAL_PIPELINE_ID } from "./env";

export type BitrixDealStageRow = { statusId: string; name: string };

/**
 * `crm.deal.list` often returns `STAGE_ID` as `C{categoryId}:{STATUS_ID}` while
 * `crm.dealcategory.stage.list` / `BITRIX_DEAL_STAGES_JSON` use bare `STATUS_ID`
 * (e.g. `UC_*`, `NEW`). Strip the prefix when it matches the configured pipeline.
 */
export function normalizeBitrixStageIdForPipeline(
  stageId: string,
  pipelineCategoryId: string,
): string {
  const t = stageId.trim();
  const cat = String(pipelineCategoryId ?? "").trim();
  if (!t || !cat) return t;
  const m = /^C(\d+):(.+)$/i.exec(t);
  const rest = m?.[2]?.trim();
  const prefixCat = m?.[1];
  if (prefixCat != null && rest && prefixCat === cat) {
    return rest;
  }
  return t;
}

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

/** Stages for the deal pipeline UI. Populate via `bun run fetch-stages` in @repo/bitrix-sync or `BITRIX_DEAL_STAGES_JSON`. */
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

/** First column in the configured pipeline, or Bitrix default `NEW`. */
export function getDefaultBitrixStageId(stages: BitrixDealStageRow[]): string {
  const id = stages[0]?.statusId?.trim();
  if (id) return id;
  return "NEW";
}

/** Human label for a `STAGE_ID` using the configured pipeline snapshot. */
export function resolveBitrixStageLabel(
  statusId: string,
  stages: BitrixDealStageRow[],
): string {
  const t = statusId.trim();
  const canonical = normalizeBitrixStageIdForPipeline(t, BITRIX_DEAL_PIPELINE_ID);
  const row =
    stages.find((s) => s.statusId === t) ??
    stages.find((s) => s.statusId === canonical);
  return row?.name?.trim() || canonical || t;
}
