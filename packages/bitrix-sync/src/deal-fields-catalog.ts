import defaultCatalog from "../data/bitrix-deal-fields.json";
import {
  getBitrixDealEbitdaFieldCode,
  getBitrixDealEbitdaMarginFieldCode,
  getBitrixDealTeaserFieldCode,
} from "./env";
import { getBitrixOpportunitySyncUfCodes } from "./opportunity-uf";

export type BitrixDealFieldRow = {
  fieldId: string;
  type: string;
  title: string;
  isRequired?: boolean;
  isReadOnly?: boolean;
  isMultiple?: boolean;
};

export type BitrixDealFieldsFile = {
  fetchedAt: string | null;
  source?: string;
  fields: BitrixDealFieldRow[];
};

function pickLocalizedString(v: unknown): string {
  if (typeof v === "string") return v.trim();
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    for (const k of ["en", "de", "ru"]) {
      const s = o[k];
      if (typeof s === "string" && s.trim()) return s.trim();
    }
    const first = Object.values(o).find((x) => typeof x === "string" && x.trim());
    if (typeof first === "string") return first.trim();
  }
  return "";
}

function pickFieldTitle(meta: Record<string, unknown>): string {
  const direct =
    pickLocalizedString(meta.title) ||
    pickLocalizedString(meta.listLabel) ||
    pickLocalizedString(meta.formLabel) ||
    pickLocalizedString(meta.editFormLabel) ||
    pickLocalizedString(meta.listColumnLabel);
  return direct;
}

function pickBool(meta: Record<string, unknown>, key: string): boolean | undefined {
  const v = meta[key];
  return typeof v === "boolean" ? v : undefined;
}

/** Turn `crm.deal.fields` `result` object into a stable row list. */
export function normalizeBitrixDealFieldsResult(
  raw: Record<string, unknown>,
): BitrixDealFieldRow[] {
  const rows: BitrixDealFieldRow[] = [];
  for (const [fieldId, meta] of Object.entries(raw)) {
    if (!fieldId.trim() || !meta || typeof meta !== "object") continue;
    const m = meta as Record<string, unknown>;
    const type =
      typeof m.type === "string"
        ? m.type
        : typeof m.dataType === "string"
          ? m.dataType
          : "unknown";
    const title = pickFieldTitle(m) || fieldId;
    rows.push({
      fieldId,
      type,
      title,
      isRequired: pickBool(m, "isRequired"),
      isReadOnly: pickBool(m, "isReadOnly"),
      isMultiple: pickBool(m, "isMultiple"),
    });
  }
  rows.sort((a, b) => a.fieldId.localeCompare(b.fieldId));
  return rows;
}

/** One row from `crm.deal.userfield.list` → catalog row (covers portals where UF_* are omitted from `crm.deal.fields`). */
export function normalizeBitrixDealUserfieldListItem(
  item: Record<string, unknown>,
): BitrixDealFieldRow | null {
  const fieldId =
    typeof item.FIELD_NAME === "string" ? item.FIELD_NAME.trim() : "";
  if (!fieldId) return null;
  const type =
    typeof item.USER_TYPE_ID === "string" && item.USER_TYPE_ID.trim()
      ? item.USER_TYPE_ID.trim()
      : "unknown";
  const title =
    (typeof item.EDIT_FORM_LABEL === "string" &&
      item.EDIT_FORM_LABEL.trim()) ||
    (typeof item.LIST_COLUMN_LABEL === "string" &&
      item.LIST_COLUMN_LABEL.trim()) ||
    (typeof item.LIST_FILTER_LABEL === "string" &&
      item.LIST_FILTER_LABEL.trim()) ||
    fieldId;
  const isMultiple =
    item.MULTIPLE === "Y" ? true : item.MULTIPLE === "N" ? false : undefined;
  const isRequired =
    item.MANDATORY === "Y" ? true : item.MANDATORY === "N" ? false : undefined;
  return {
    fieldId,
    type,
    title,
    isRequired,
    isMultiple,
  };
}

function pickMergedFieldTitle(
  fieldId: string,
  fromUserfield: string,
  fromDealFields: string,
): string {
  const good = (t: string) => Boolean(t.trim()) && t.trim() !== fieldId;
  const u = fromUserfield.trim();
  const d = fromDealFields.trim();
  if (good(d)) return d;
  if (good(u)) return u;
  return d || u || fieldId;
}

/**
 * Union of `crm.deal.fields` and `crm.deal.userfield.list`.
 * Merges labels when `crm.deal.fields` only exposes the raw `UF_*` id as the title.
 */
export function mergeBitrixDealFieldRows(
  fromDealFields: BitrixDealFieldRow[],
  fromUserfieldList: BitrixDealFieldRow[],
): BitrixDealFieldRow[] {
  const byId = new Map<string, BitrixDealFieldRow>();
  for (const row of fromUserfieldList) {
    byId.set(row.fieldId, { ...row });
  }
  for (const row of fromDealFields) {
    const existing = byId.get(row.fieldId);
    if (existing) {
      byId.set(row.fieldId, {
        ...existing,
        ...row,
        title: pickMergedFieldTitle(row.fieldId, existing.title, row.title),
        isRequired:
          row.isRequired !== undefined ? row.isRequired : existing.isRequired,
        isReadOnly:
          row.isReadOnly !== undefined ? row.isReadOnly : existing.isReadOnly,
        isMultiple:
          row.isMultiple !== undefined ? row.isMultiple : existing.isMultiple,
      });
    } else {
      byId.set(row.fieldId, row);
    }
  }
  return [...byId.values()].sort((a, b) => a.fieldId.localeCompare(b.fieldId));
}

function parseCatalogJson(raw: string): BitrixDealFieldRow[] {
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== "object") return [];
  const o = parsed as Record<string, unknown>;
  if (Array.isArray(o.fields)) {
    return parseFieldsArray(o.fields);
  }
  if (!Array.isArray(parsed)) return [];
  return parseFieldsArray(parsed);
}

function parseFieldsArray(arr: unknown[]): BitrixDealFieldRow[] {
  const out: BitrixDealFieldRow[] = [];
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const fieldId =
      typeof r.fieldId === "string"
        ? r.fieldId.trim()
        : typeof r.FIELD_ID === "string"
          ? r.FIELD_ID.trim()
          : "";
    if (!fieldId) continue;
    const type = typeof r.type === "string" ? r.type : "unknown";
    const title =
      typeof r.title === "string" && r.title.trim()
        ? r.title.trim()
        : fieldId;
    out.push({
      fieldId,
      type,
      title,
      isRequired: typeof r.isRequired === "boolean" ? r.isRequired : undefined,
      isReadOnly: typeof r.isReadOnly === "boolean" ? r.isReadOnly : undefined,
      isMultiple: typeof r.isMultiple === "boolean" ? r.isMultiple : undefined,
    });
  }
  return out;
}

/** All deal fields from last fetch (or env override). Empty until you run `fetch-deal-fields`. */
export function getBitrixDealFieldsCatalog(): BitrixDealFieldRow[] {
  const fromEnv = process.env.BITRIX_DEAL_FIELDS_JSON?.trim();
  if (fromEnv) {
    try {
      return parseCatalogJson(fromEnv);
    } catch {
      return [];
    }
  }
  const f = defaultCatalog as BitrixDealFieldsFile;
  if (f?.fields && Array.isArray(f.fields)) {
    return parseFieldsArray(f.fields as unknown[]);
  }
  return [];
}

/**
 * Teaser UF: explicit `BITRIX_DEAL_TEASER_UF`, else a single catalog field whose
 * title contains "Teaser" (from `fetch-deal-fields` / `BITRIX_DEAL_FIELDS_JSON`).
 */
export function resolveBitrixDealTeaserFieldCode(): string | undefined {
  const fromEnv = getBitrixDealTeaserFieldCode();
  if (fromEnv) return fromEnv;
  const catalog = getBitrixDealFieldsCatalog();
  const hits = catalog.filter(
    (f) =>
      /\bteaser\b/i.test(f.title) &&
      f.fieldId !== "COMMENTS" &&
      f.fieldId !== "TITLE",
  );
  if (hits.length === 1) return hits[0]!.fieldId;
  return undefined;
}

/**
 * EBITDA deal UF: `BITRIX_DEAL_EBITDA_UF` / `BITRIX_UF_EBITDA`, else exactly one catalog UF whose title contains “EBITDA” but not “margin”.
 */
export function resolveBitrixDealEbitdaFieldCode(): string | undefined {
  const fromEnv =
    getBitrixDealEbitdaFieldCode() ||
    getBitrixOpportunitySyncUfCodes().ebitda.trim();
  if (fromEnv) return fromEnv;
  const catalog = getBitrixDealFieldsCatalog();
  const hits = catalog.filter((f) => {
    if (!f.fieldId.startsWith("UF_")) return false;
    const t = f.title.trim();
    if (!/\bebitda\b/i.test(t)) return false;
    if (/\bmargin\b/i.test(t)) return false;
    return true;
  });
  if (hits.length === 1) return hits[0]!.fieldId;
  return undefined;
}

/**
 * EBITDA margin % UF: env or exactly one catalog UF whose title matches EBITDA + margin.
 */
export function resolveBitrixDealEbitdaMarginFieldCode(): string | undefined {
  const fromEnv =
    getBitrixDealEbitdaMarginFieldCode() ||
    getBitrixOpportunitySyncUfCodes().ebitdaMargin.trim();
  if (fromEnv) return fromEnv;
  const catalog = getBitrixDealFieldsCatalog();
  const hits = catalog.filter((f) => {
    if (!f.fieldId.startsWith("UF_")) return false;
    const t = f.title.toLowerCase();
    return t.includes("ebitda") && t.includes("margin");
  });
  if (hits.length === 1) return hits[0]!.fieldId;
  return undefined;
}

export type AiBitrixFormFieldKey =
  | "title"
  | "stageId"
  | "revenue"
  | "teaser"
  | "sourceWebsite"
  | "companyLocation"
  | "industry"
  | "askingPrice"
  | "ebitda"
  | "ebitdaMargin"
  | "brokerFirstName"
  | "brokerLastName"
  | "brokerEmail"
  | "brokerPhone"
  | "brokerLinkedIn";

const FALLBACK_LABELS: Record<AiBitrixFormFieldKey, string> = {
  title: "Title",
  stageId: "Bitrix stage",
  revenue: "Revenue (TTM / company)",
  teaser: "Deal narrative (full description)",
  sourceWebsite: "Source website",
  companyLocation: "Company location",
  industry: "Industry",
  askingPrice: "Asking price",
  ebitda: "EBITDA",
  ebitdaMargin: "EBITDA margin",
  brokerFirstName: "Broker first name",
  brokerLastName: "Broker last name",
  brokerEmail: "Broker email",
  brokerPhone: "Broker phone",
  brokerLinkedIn: "Broker LinkedIn",
};

/** Labels + Bitrix field codes for the AI inject review form (aligned with `buildCrmDealFieldsFromOpportunitySync`). */
export function getAiBitrixFormFieldMeta(): Record<
  AiBitrixFormFieldKey,
  { label: string; bitrixFieldId: string }
> {
  const catalog = getBitrixDealFieldsCatalog();
  const byId = new Map(catalog.map((f) => [f.fieldId, f]));
  const teaserUf = resolveBitrixDealTeaserFieldCode();

  const mergedIntoComments = (key: AiBitrixFormFieldKey, bitrixFieldId: string) =>
    bitrixFieldId === "COMMENTS" &&
    (key === "industry" ||
      key === "ebitda" ||
      key === "ebitdaMargin" ||
      key === "teaser");

  const resolve = (
    key: AiBitrixFormFieldKey,
    bitrixFieldId: string,
  ): { label: string; bitrixFieldId: string } => {
    const id = bitrixFieldId.trim();
    if (!id) {
      return { label: FALLBACK_LABELS[key], bitrixFieldId: "" };
    }
    const row = byId.get(id);
    const portalTitle = row?.title?.trim();
    const usePortalTitle =
      Boolean(portalTitle) &&
      portalTitle !== id &&
      !mergedIntoComments(key, id);
    const label =
      usePortalTitle && portalTitle ? portalTitle : FALLBACK_LABELS[key];
    return { label, bitrixFieldId: id };
  };

  const uf = getBitrixOpportunitySyncUfCodes();
  /** Sync sends narrative to standard `SOURCE_DESCRIPTION` when no dedicated teaser UF is configured. */
  const teaserTarget = teaserUf ?? "SOURCE_DESCRIPTION";
  const ebitdaTarget = resolveBitrixDealEbitdaFieldCode() ?? "";
  const ebitdaMarginTarget = resolveBitrixDealEbitdaMarginFieldCode() ?? "";

  return {
    title: resolve("title", "TITLE"),
    stageId: resolve("stageId", "STAGE_ID"),
    revenue: resolve("revenue", uf.revenue),
    teaser: resolve("teaser", teaserTarget),
    sourceWebsite: resolve("sourceWebsite", uf.sourceWebsite),
    companyLocation: resolve("companyLocation", uf.companyLocation),
    industry: resolve("industry", "COMMENTS"),
    askingPrice: resolve("askingPrice", uf.askingPrice),
    ebitda: resolve("ebitda", ebitdaTarget || "COMMENTS"),
    ebitdaMargin: resolve(
      "ebitdaMargin",
      ebitdaMarginTarget || "COMMENTS",
    ),
    brokerFirstName: resolve("brokerFirstName", uf.brokerFirstName),
    brokerLastName: resolve("brokerLastName", uf.brokerLastName),
    brokerEmail: resolve("brokerEmail", uf.brokerEmail),
    brokerPhone: resolve("brokerPhone", uf.brokerWorkPhone),
    brokerLinkedIn: resolve("brokerLinkedIn", uf.brokerLinkedIn),
  };
}
