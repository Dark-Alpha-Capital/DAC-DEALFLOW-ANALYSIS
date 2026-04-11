/**
 * Bitrix CRM deal pipeline / funnel id (`CATEGORY_ID` on `crm.deal.add` / `update`).
 * `0` = portal default pipeline (Dark Alpha Capital).
 */
export const BITRIX_DEAL_PIPELINE_ID = "0";

export type BitrixSyncEnv = {
  webhookBaseUrl: string;
  dealCategoryId: string;
  portalBaseUrl: string;
  defaultStageId: string | undefined;
};

/** Normalize base URL: no trailing slash, no /.json suffix on method path (caller adds method). */
export function getBitrixSyncEnv(): BitrixSyncEnv | null {
  const raw = process.env.BITRIX24_WEBHOOK?.trim();
  if (!raw) return null;
  const webhookBaseUrl = raw.replace(/\/+$/, "");
  const dealCategoryId = BITRIX_DEAL_PIPELINE_ID;
  const portalBaseUrl = (process.env.BITRIX24_PORTAL_BASE ?? "")
    .trim()
    .replace(/\/+$/, "");
  const defaultStageId = process.env.BITRIX_DEFAULT_STAGE_ID?.trim() || undefined;
  return {
    webhookBaseUrl,
    dealCategoryId,
    portalBaseUrl,
    defaultStageId,
  };
}

export function requireBitrixWebhookBase(): string {
  const env = getBitrixSyncEnv();
  if (!env?.webhookBaseUrl) {
    throw new Error("BITRIX24_WEBHOOK is not configured");
  }
  return env.webhookBaseUrl;
}

/**
 * Custom deal field code for teaser / long summary (e.g. `UF_CRM_1234567890`).
 * Find it in Bitrix24 → CRM → Settings → Deal fields. When set, sync maps
 * teaser + description + comments into this field.
 */
export function getBitrixDealTeaserFieldCode(): string | undefined {
  const v = process.env.BITRIX_DEAL_TEASER_UF?.trim();
  return v || undefined;
}

/** Deal user field for EBITDA ($). Set when catalog auto-detect cannot find a single “EBITDA” UF. */
export function getBitrixDealEbitdaFieldCode(): string | undefined {
  const v = process.env.BITRIX_DEAL_EBITDA_UF?.trim();
  return v || undefined;
}

/** Optional UF for EBITDA margin (%). */
export function getBitrixDealEbitdaMarginFieldCode(): string | undefined {
  const v = process.env.BITRIX_DEAL_EBITDA_MARGIN_UF?.trim();
  return v || undefined;
}

export function buildBitrixDealDetailUrl(
  portalBaseUrl: string,
  bitrixDealId: string,
): string {
  const base = portalBaseUrl.replace(/\/+$/, "");
  if (!base) return "";
  return `${base}/crm/deal/details/${bitrixDealId}/`;
}

/** Derive `https://tenant.bitrix24.com` from inbound webhook URL when `BITRIX24_PORTAL_BASE` is unset. */
export function inferPortalBaseFromWebhook(webhookBaseUrl: string): string {
  try {
    const u = new URL(webhookBaseUrl);
    return `${u.protocol}//${u.host}`;
  } catch {
    return "";
  }
}
