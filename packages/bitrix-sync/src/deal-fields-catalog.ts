import defaultCatalog from "../data/bitrix-deal-fields.json";
import { BITRIX_UF } from "./deal-fields";
import { getBitrixDealTeaserFieldCode } from "./env";

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

export type AiBitrixFormFieldKey =
  | "title"
  | "stageId"
  | "opportunity"
  | "revenue"
  | "currencyId"
  | "teaser"
  | "description"
  | "comments"
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
  opportunity: "Opportunity (deal value)",
  revenue: "Revenue (TTM / company)",
  currencyId: "Currency",
  teaser: "Teaser",
  description: "Description",
  comments: "Comments (extra)",
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
  const teaserUf = getBitrixDealTeaserFieldCode();

  const mergedIntoComments = (key: AiBitrixFormFieldKey, bitrixFieldId: string) =>
    bitrixFieldId === "COMMENTS" &&
    (key === "description" ||
      key === "industry" ||
      key === "ebitda" ||
      key === "ebitdaMargin" ||
      key === "teaser");

  const resolve = (
    key: AiBitrixFormFieldKey,
    bitrixFieldId: string,
  ): { label: string; bitrixFieldId: string } => {
    const row = byId.get(bitrixFieldId);
    const portalTitle = row?.title?.trim();
    const usePortalTitle =
      Boolean(portalTitle) &&
      portalTitle !== bitrixFieldId &&
      !mergedIntoComments(key, bitrixFieldId);
    const label = usePortalTitle && portalTitle ? portalTitle : FALLBACK_LABELS[key];
    return { label, bitrixFieldId };
  };

  const teaserTarget = teaserUf ?? "COMMENTS";

  return {
    title: resolve("title", "TITLE"),
    stageId: resolve("stageId", "STAGE_ID"),
    opportunity: resolve("opportunity", "OPPORTUNITY"),
    revenue: resolve("revenue", BITRIX_UF.revenue),
    currencyId: resolve("currencyId", "CURRENCY_ID"),
    teaser: resolve("teaser", teaserTarget),
    description: resolve("description", "COMMENTS"),
    comments: resolve("comments", "COMMENTS"),
    sourceWebsite: resolve("sourceWebsite", BITRIX_UF.sourceWebsite),
    companyLocation: resolve("companyLocation", BITRIX_UF.companyLocation),
    industry: resolve("industry", "COMMENTS"),
    askingPrice: resolve("askingPrice", BITRIX_UF.askingPrice),
    ebitda: resolve("ebitda", "COMMENTS"),
    ebitdaMargin: resolve("ebitdaMargin", "COMMENTS"),
    brokerFirstName: resolve("brokerFirstName", BITRIX_UF.brokerFirstName),
    brokerLastName: resolve("brokerLastName", BITRIX_UF.brokerLastName),
    brokerEmail: resolve("brokerEmail", BITRIX_UF.brokerEmail),
    brokerPhone: resolve("brokerPhone", BITRIX_UF.brokerWorkPhone),
    brokerLinkedIn: resolve("brokerLinkedIn", BITRIX_UF.brokerLinkedIn),
  };
}
