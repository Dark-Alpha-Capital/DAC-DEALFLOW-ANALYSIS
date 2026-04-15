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

/**
 * Extract the webhook secret from a Bitrix inbound webhook URL.
 * URL format: `https://portal.bitrix24.com/rest/USER_ID/WEBHOOK_SECRET/`
 * The secret is the last non-empty path segment.
 */
export function extractWebhookAuthToken(webhookBaseUrl: string): string | null {
  try {
    const u = new URL(webhookBaseUrl);
    const segments = u.pathname.split("/").filter(Boolean);
    return segments.at(-1) ?? null;
  } catch {
    return null;
  }
}

/**
 * Given a CRM file downloadUrl (which has `auth=` empty by default) and a
 * webhook secret, return the URL with `auth=SECRET` so server-side fetch works.
 */
export function injectWebhookAuthIntoCrmUrl(
  crmUrl: string,
  webhookBaseUrl: string,
): string {
  const secret = extractWebhookAuthToken(webhookBaseUrl);
  if (!secret) return crmUrl;
  return crmUrl.replace(/\bauth=(?=&|$)/i, `auth=${secret}`);
}

/** Turn relative CRM / Bitrix paths (e.g. `/bitrix/components/...`) into absolute portal URLs. */
export function resolveBitrixPortalUrl(
  portalBase: string,
  pathOrUrl: string,
): string {
  const p = pathOrUrl.trim();
  if (!p) return "";
  if (/^https?:\/\//i.test(p)) return p;
  const base = portalBase.replace(/\/+$/, "");
  if (p.startsWith("/")) return `${base}${p}`;
  return `${base}/${p.replace(/^\/+/, "")}`;
}
