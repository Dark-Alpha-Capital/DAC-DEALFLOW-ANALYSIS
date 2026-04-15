import { callBitrix, callBitrixListAll } from "./client";
import {
  resolveBitrixDealEbitdaFieldCode,
  resolveBitrixDealEbitdaMarginFieldCode,
  resolveBitrixDealTeaserFieldCode,
} from "./deal-fields-catalog";
import { BITRIX_DEAL_PIPELINE_ID } from "./env";
import { getBitrixOpportunitySyncUfCodes } from "./opportunity-uf";
import {
  getDefaultBitrixStageId,
  normalizeBitrixStageIdForPipeline,
  type BitrixDealStageRow,
} from "./stages";

const DEAL_LIST_BASE_FIELDS = [
  "ID",
  "TITLE",
  "STAGE_ID",
  "CATEGORY_ID",
  "OPPORTUNITY",
  "COMMENTS",
  "SOURCE_DESCRIPTION",
  "ADDITIONAL_INFO",
  "DATE_CREATE",
  "CURRENCY_ID",
  /** Primary broker contact when "Broker details" is a linked CRM contact */
  "CONTACT_ID",
  "CONTACT_IDS",
  /** Linked CRM company (brokerage name via batch `crm.company.list`) */
  "COMPANY_ID",
] as const;

export type NormalizedBitrixDealImport = {
  bitrixId: string;
  /** Bitrix deal `STAGE_ID` (same as `DealOpportunity.stage` in DB). */
  stage: string;
  /** Bitrix `TITLE` */
  title: string | null;
  /** Configured teaser user field only (not TITLE). */
  dealTeaser: string | null;
  description: string | null;
  sourceWebsite: string | null;
  revenue: number | null;
  ebitda: number | null;
  ebitdaMargin: number | null;
  /** Diagnostic only: how EBITDA/margin were parsed (for Bitrix import logs). */
  ebitdaParseDebug?: {
    notes: string[];
  };
  askingPrice: number | null;
  brokerFirstName: string | null;
  brokerLastName: string | null;
  brokerEmail: string | null;
  brokerPhone: string | null;
  brokerLinkedIn: string | null;
  /** Bitrix linked company `TITLE` when `COMPANY_ID` is set and companies were batch-loaded. */
  brokerage: string | null;
  /** State / address combined for `DealOpportunity.companyLocation`. */
  companyLocation: string | null;
  cimLink: string | null;
  dataRoomLink: string | null;
  bitrixCreatedAt: Date | null;
};

function trimString(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "string") {
    const t = v.trim();
    return t.length > 0 ? t : null;
  }
  if (typeof v === "number" && Number.isFinite(v)) {
    return String(v);
  }
  return null;
}

/**
 * Bitrix list/get often returns `{ VALUE }`, multifield arrays, or nested text.
 */
export function extractBitrixString(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "string") {
    const t = v.trim();
    return t.length > 0 ? t : null;
  }
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  if (Array.isArray(v)) {
    for (const item of v) {
      const s = extractBitrixString(item);
      if (s) return s;
    }
    return null;
  }
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if ("VALUE" in o) return extractBitrixString(o.VALUE);
    if (typeof o.text === "string") return extractBitrixString(o.text);
    if (typeof o.TEXT === "string") return extractBitrixString(o.TEXT);
  }
  return null;
}

/**
 * Bitrix `address` user field: object with ADDRESS / CITY / REGION / … or nested `VALUE`.
 */
export function formatBitrixAddressValue(v: unknown): string | null {
  if (v == null) return null;
  const flat = extractBitrixString(v);
  if (flat) return flat;
  if (typeof v !== "object" || v === null || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  if ("VALUE" in o && o.VALUE != null && typeof o.VALUE === "object") {
    return formatBitrixAddressValue(o.VALUE);
  }
  const parts = [
    extractBitrixString(o.ADDRESS ?? o.address),
    extractBitrixString(o.CITY ?? o.city),
    extractBitrixString(o.REGION ?? o.REGION_NAME ?? o.region),
    extractBitrixString(o.POSTAL_CODE ?? o.POSTCODE ?? o.postalCode),
    extractBitrixString(o.COUNTRY ?? o.country),
  ].filter(Boolean);
  if (parts.length > 0) return parts.join(", ");
  return extractBitrixString(o.TEXT ?? o.text);
}

function firstBitrixPhone(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "string") return trimString(v);
  if (!Array.isArray(v)) return null;
  for (const item of v) {
    if (item && typeof item === "object" && "VALUE" in item) {
      const s = trimString((item as { VALUE?: unknown }).VALUE);
      if (s) return s;
    }
  }
  return null;
}

/** Deal row → linked contact id(s), primary first (CONTACT_ID then CONTACT_IDS). */
export function extractBitrixDealContactIds(row: Record<string, unknown>): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];

  const add = (v: unknown) => {
    if (v == null || v === "") return;
    if (typeof v === "string" || typeof v === "number") {
      const s = String(v).trim();
      if (s && !seen.has(s)) {
        seen.add(s);
        ordered.push(s);
      }
      return;
    }
    if (Array.isArray(v)) {
      for (const item of v) add(item);
      return;
    }
    if (typeof v === "object") {
      const o = v as Record<string, unknown>;
      const inner = o.ID ?? o.id ?? o.VALUE ?? o.value;
      if (inner != null) add(inner);
    }
  };

  add(row.CONTACT_ID);
  add(row.CONTACT_IDS);
  return ordered;
}

/** Bitrix deal `COMPANY_ID` (linked CRM company / brokerage). */
export function extractBitrixDealCompanyId(
  row: Record<string, unknown>,
): string | null {
  const v = row.COMPANY_ID;
  if (v == null || v === "") return null;
  const s = String(v).trim();
  return s || null;
}

export type BitrixContactBrokerFields = {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
};

/**
 * Batch-load contacts for deal import (broker block in Bitrix is usually CONTACT_ID).
 */
export async function fetchBitrixContactBrokerMap(
  contactIds: string[],
  options?: { webhookBaseUrl?: string },
): Promise<Map<string, BitrixContactBrokerFields>> {
  const unique = [...new Set(contactIds.map((id) => id.trim()).filter(Boolean))];
  const map = new Map<string, BitrixContactBrokerFields>();
  if (unique.length === 0) return map;

  const chunkSize = 45;
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize);
    const numericChunk = chunk.map((id) => {
      const n = Number(id);
      return Number.isFinite(n) ? n : id;
    });
    const rows = await callBitrix<Record<string, unknown>[]>(
      "crm.contact.list",
      {
        filter: { "@ID": numericChunk },
        select: ["ID", "NAME", "LAST_NAME", "EMAIL", "PHONE"],
      },
      options,
    );
    if (!Array.isArray(rows)) continue;
    for (const c of rows) {
      const idRaw = c.ID;
      const id = idRaw != null ? String(idRaw).trim() : "";
      if (!id) continue;
      map.set(id, {
        firstName: extractBitrixString(c.NAME),
        lastName: extractBitrixString(c.LAST_NAME),
        email: extractBitrixString(c.EMAIL),
        phone: firstBitrixPhone(c.PHONE),
      });
    }
  }
  return map;
}

/**
 * Batch-load company titles for deal import (`COMPANY_ID` → brokerage display name).
 */
export async function fetchBitrixCompanyTitleMap(
  companyIds: string[],
  options?: { webhookBaseUrl?: string },
): Promise<Map<string, string>> {
  const unique = [...new Set(companyIds.map((id) => id.trim()).filter(Boolean))];
  const map = new Map<string, string>();
  if (unique.length === 0) return map;

  const chunkSize = 45;
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize);
    const numericChunk = chunk.map((id) => {
      const n = Number(id);
      return Number.isFinite(n) ? n : id;
    });
    const rows = await callBitrix<Record<string, unknown>[]>(
      "crm.company.list",
      {
        filter: { "@ID": numericChunk },
        select: ["ID", "TITLE"],
      },
      options,
    );
    if (!Array.isArray(rows)) continue;
    for (const c of rows) {
      const idRaw = c.ID;
      const id = idRaw != null ? String(idRaw).trim() : "";
      if (!id) continue;
      const title = extractBitrixString(c.TITLE);
      if (title) map.set(id, title);
    }
  }
  return map;
}

/** Bitrix money / numeric user fields often return `{ VALUE, CURRENCY }`. */
export function coerceBitrixNumeric(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    let t = v.trim();
    /** Bitrix `money` UF string form: `20000000|USD` */
    if (t.includes("|")) {
      t = t.split("|")[0]!.trim();
    }
    t = t.replace(/^\$\s*/, "").replace(/,/g, "");
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof v === "object" && v !== null && !Array.isArray(v)) {
    const o = v as Record<string, unknown>;
    if ("VALUE" in o) {
      return coerceBitrixNumeric(o.VALUE);
    }
  }
  return null;
}

const ISO4217 = /^[A-Z]{3}$/;

/** Parse Bitrix money UF: `amount|USD` or `{ VALUE, CURRENCY }`. */
export function parseBitrixMoneyParts(
  v: unknown,
): { amount: number; currency: string } | null {
  if (v == null || v === "") return null;
  if (typeof v === "string") {
    const t = v.trim();
    if (t.includes("|")) {
      const [a, cur] = t.split("|", 2);
      const amount = Number(String(a).replace(/,/g, ""));
      const currency = (cur ?? "USD").trim().toUpperCase();
      if (!Number.isFinite(amount)) return null;
      if (!ISO4217.test(currency)) return { amount, currency: "USD" };
      return { amount, currency };
    }
  }
  if (typeof v === "object" && v !== null && !Array.isArray(v)) {
    const o = v as Record<string, unknown>;
    const curRaw = o.CURRENCY ?? o.currency;
    if (o.VALUE !== undefined && o.VALUE !== null && curRaw != null) {
      const amount = coerceBitrixNumeric(o.VALUE);
      const currency = String(curRaw).trim().toUpperCase();
      if (amount == null || !Number.isFinite(amount)) return null;
      if (!ISO4217.test(currency)) return { amount, currency: "USD" };
      return { amount, currency };
    }
  }
  const n = coerceBitrixNumeric(v);
  if (n != null && Number.isFinite(n)) {
    return { amount: n, currency: "USD" };
  }
  return null;
}

/** Human-readable currency (commas + symbol) for widget / logs. */
export function formatBitrixMoneyForDisplay(v: unknown): string | null {
  const p = parseBitrixMoneyParts(v);
  if (!p) return null;
  const hasCents = Math.round(p.amount * 100) % 100 !== 0;
  const maxFrac = hasCents ? 2 : 0;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: p.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: maxFrac,
    }).format(p.amount);
  } catch {
    return (
      new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: maxFrac,
      }).format(p.amount) + " " + p.currency
    );
  }
}

function applyMillionsScale(n: number, suffix: string | undefined): number {
  if (suffix == null) return n;
  const u = suffix.toLowerCase();
  if (u === "m" || u === "mm") return n * 1e6;
  return n;
}

/**
 * Parse EBITDA / margin from teaser + `SOURCE_DESCRIPTION` style prose.
 * Handles line-based blocks and inline phrases like `(with 23% EBITDA Margin)`.
 */
export function parseFinancialLinesFromTeaser(
  teaser: string | null,
): {
  ebitda: number | null;
  ebitdaMargin: number | null;
  debug: { notes: string[] };
} {
  const notes: string[] = [];
  if (!teaser?.trim()) {
    return { ebitda: null, ebitdaMargin: null, debug: { notes: ["no teaser text"] } };
  }

  const text = teaser.replace(/\r\n/g, "\n").trim();
  notes.push(`textChars=${text.length}`);

  let ebitda: number | null = null;
  let ebitdaMargin: number | null = null;

  for (const line of text.split(/\n/)) {
    const ebitdaLine = line.match(
      /^\s*EBITDA\s*:\s*\$?\s*([\d,]+(?:\.\d+)?)\s*([mM]{1,2})?\s*$/i,
    );
    if (ebitdaLine?.[1]) {
      const n = coerceBitrixNumeric(ebitdaLine[1]);
      if (n != null && Number.isFinite(n)) {
        ebitda = applyMillionsScale(n, ebitdaLine[2]);
        notes.push("ebitda:line-EBITDA-colon");
      }
    }
    const marginLine = line.match(/^\s*Margin\s*:\s*([\d.]+)\s*%?\s*$/i);
    if (marginLine?.[1] && ebitdaMargin == null) {
      const n = coerceBitrixNumeric(marginLine[1]);
      if (n != null && Number.isFinite(n)) {
        ebitdaMargin = n;
        notes.push("margin:line-Margin-colon");
      }
    }
  }

  // Inline: "(with 23% EBITDA Margin)" / "23% EBITDA Margin"
  if (ebitdaMargin == null) {
    for (const m of text.matchAll(
      /(\d+(?:\.\d+)?)\s*%\s*EBITDA\s*Margin\b/gi,
    )) {
      const n = coerceBitrixNumeric(m[1]);
      if (n != null && n >= 0 && n <= 100) {
        ebitdaMargin = n;
        notes.push(`margin:inline-${n}% EBITDA Margin`);
        break;
      }
    }
  }

  if (ebitdaMargin == null) {
    const em = text.match(
      /EBITDA\s*Margin\s*(?:of|is|:)?\s*(\d+(?:\.\d+)?)\s*%/i,
    );
    if (em?.[1]) {
      const n = coerceBitrixNumeric(em[1]);
      if (n != null && n >= 0 && n <= 100) {
        ebitdaMargin = n;
        notes.push("margin:EBITDA Margin label");
      }
    }
  }

  // Inline dollar EBITDA (not margin): "EBITDA of $4.2M" / "TTM EBITDA: 3.5m"
  if (ebitda == null) {
    const ttm = text.match(
      /\bTTM\s+EBITDA\s*[:\s]+\$?\s*([\d,]+(?:\.\d+)?)\s*([mM]{1,2})?\b/i,
    );
    if (ttm?.[1]) {
      const n = coerceBitrixNumeric(ttm[1]);
      if (n != null && Number.isFinite(n)) {
        ebitda = applyMillionsScale(n, ttm[2]);
        notes.push("ebitda:TTM EBITDA");
      }
    }
  }
  if (ebitda == null) {
    for (const m of text.matchAll(
      /\bEBITDA\s*(?:of|is|:)\s*\$?\s*([\d,]+(?:\.\d+)?)\s*([mM]{1,2})?(?!\s*%)/gi,
    )) {
      const n = coerceBitrixNumeric(m[1]);
      if (n != null && Number.isFinite(n)) {
        ebitda = applyMillionsScale(n, m[2]);
        notes.push("ebitda:inline EBITDA of");
        break;
      }
    }
  }

  // "$1,500,000 EBITDA" / "$1500000 EBITDA" (common Bitrix label + value layout)
  if (ebitda == null) {
    const labeled = text.match(
      /\$\s*([\d,]+(?:\.\d+)?)\s*(?:USD)?\s+EBITDA\b/i,
    );
    if (labeled?.[1]) {
      const n = coerceBitrixNumeric(labeled[1]);
      if (n != null && Number.isFinite(n)) {
        ebitda = n;
        notes.push("ebitda:inline-$-before-EBITDA");
      }
    }
  }

  // "$2.0M EBITDA" / "2.5M EBITDA" in title or body
  if (ebitda == null) {
    for (const m of text.matchAll(
      /\$?\s*([\d,]+(?:\.\d+)?)\s*M\b\s*EBITDA\b/gi,
    )) {
      const n = coerceBitrixNumeric(m[1]);
      if (n != null && Number.isFinite(n)) {
        ebitda = applyMillionsScale(n, "M");
        notes.push("ebitda:inline-$XM-EBITDA");
        break;
      }
    }
  }

  if (ebitda == null && ebitdaMargin == null) {
    notes.push("no EBITDA/margin pattern matched");
  } else if (ebitda == null) {
    notes.push("ebitda:not found (margin only)");
  } else if (ebitdaMargin == null) {
    notes.push("margin:not found (EBITDA only)");
  }

  return { ebitda, ebitdaMargin, debug: { notes } };
}

/**
 * Raw `STAGE_ID` from `crm.deal.list` (handles alternate keys / `{ VALUE }` shapes).
 */
export function extractBitrixDealListStageIdRaw(
  row: Record<string, unknown>,
): string | null {
  const candidates: unknown[] = [
    row.STAGE_ID,
    row.stage_id,
    row["STAGE_ID"],
  ];
  for (const v of candidates) {
    if (v == null || v === "") continue;
    if (typeof v === "object" && v !== null && !Array.isArray(v)) {
      const o = v as Record<string, unknown>;
      const inner = o.VALUE ?? o.value ?? o.ID ?? o.id;
      if (inner != null && inner !== "") {
        const s = String(inner).trim();
        if (s) return s;
      }
      continue;
    }
    const s = String(v).trim();
    if (s) return s;
  }
  return null;
}

function parseBitrixDate(v: unknown): Date | null {
  if (v == null) return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/**
 * Field names for `crm.deal.list` `select`, including configured UFs used on outbound sync.
 */
export function buildDealListSelect(): string[] {
  const uf = getBitrixOpportunitySyncUfCodes();
  const ufCodes = Object.values(uf)
    .map((c) => c.trim())
    .filter(Boolean);
  const teaser = resolveBitrixDealTeaserFieldCode()?.trim();
  const ebitdaUf = resolveBitrixDealEbitdaFieldCode()?.trim();
  const ebitdaMarginUf = resolveBitrixDealEbitdaMarginFieldCode()?.trim();
  const set = new Set<string>([...DEAL_LIST_BASE_FIELDS, ...ufCodes]);
  if (teaser) set.add(teaser);
  if (ebitdaUf) set.add(ebitdaUf);
  if (ebitdaMarginUf) set.add(ebitdaMarginUf);
  return Array.from(set);
}

function parseDealListUfExtraFromEnv(): string[] {
  const raw = process.env.BITRIX_DEAL_LIST_UF_EXTRA?.trim();
  if (!raw) return [];
  return raw.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
}

/**
 * `select` for Bitrix deal import. Bitrix does **not** return arbitrary `UF_CRM_*` fields unless they are named here
 * (omitting `select` only yields standard fields — not custom “Deal link”, CIM file fields, etc.).
 * Append more codes via env `BITRIX_DEAL_LIST_UF_EXTRA` (comma or whitespace separated).
 */
export function buildDealListSelectForImportPipeline(): string[] {
  return [...new Set([...buildDealListSelect(), ...parseDealListUfExtraFromEnv()])];
}

/**
 * Map one `crm.deal.list` row to values suitable for `DealOpportunity` insert.
 * Returns `null` if the row has no usable Bitrix id.
 * @param stages Same source as outbound sync (`getBitrixDealStages()`), used to resolve stage names for `STAGE_ID`.
 * @param options.contactById When broker UFs are unset, fills broker fields from the deal's linked `CONTACT_ID` / `CONTACT_IDS`.
 * @param options.companyTitleById When set, maps `COMPANY_ID` → brokerage name (`crm.company` `TITLE`).
 */
export function normalizeBitrixListRow(
  row: Record<string, unknown>,
  stages: BitrixDealStageRow[],
  options?: {
    contactById?: Map<string, BitrixContactBrokerFields>;
    companyTitleById?: Map<string, string>;
  },
): NormalizedBitrixDealImport | null {
  const idRaw = row.ID;
  if (idRaw == null || idRaw === "") return null;
  const bitrixId = String(idRaw).trim();
  if (!bitrixId) return null;

  const uf = getBitrixOpportunitySyncUfCodes();
  const teaserCode = resolveBitrixDealTeaserFieldCode()?.trim();

  const title = extractBitrixString(row.TITLE);
  const opportunity = coerceBitrixNumeric(row.OPPORTUNITY);
  const revenueUf = uf.revenue.trim()
    ? coerceBitrixNumeric(row[uf.revenue])
    : null;
  const revenue =
    revenueUf != null && Number.isFinite(revenueUf)
      ? revenueUf
      : opportunity;

  let askingPrice: number | null = uf.askingPrice.trim()
    ? coerceBitrixNumeric(row[uf.askingPrice])
    : null;
  if (askingPrice == null && uf.askingPrice.trim()) {
    const apStr = extractBitrixString(row[uf.askingPrice]);
    if (apStr) askingPrice = coerceBitrixNumeric(apStr);
  }

  const sourceWebsite = uf.sourceWebsite.trim()
    ? extractBitrixString(row[uf.sourceWebsite])
    : null;

  const dealListingUrl = uf.dealListingUrl.trim()
    ? extractBitrixString(row[uf.dealListingUrl])
    : null;

  const teaserUfText = teaserCode ? extractBitrixString(row[teaserCode]) : null;
  const stateOrRegion = uf.companyLocation.trim()
    ? extractBitrixString(row[uf.companyLocation])
    : null;
  let addressFormatted: string | null = null;
  if (uf.companyAddress.trim()) {
    addressFormatted = formatBitrixAddressValue(row[uf.companyAddress]);
  }
  if (!addressFormatted?.trim() && uf.companyAddressLine.trim()) {
    addressFormatted = extractBitrixString(row[uf.companyAddressLine]);
  }
  const listingLocation =
    [stateOrRegion, addressFormatted].filter(Boolean).join(" · ") || null;

  const cimLink = uf.cimLink.trim()
    ? extractBitrixString(row[uf.cimLink])
    : null;
  const dataRoomLink = uf.dataRoomLink.trim()
    ? extractBitrixString(row[uf.dataRoomLink])
    : null;

  const comments = extractBitrixString(row.COMMENTS);
  /** Standard Bitrix deal fields (returned by default `crm.deal.list` without `select`). */
  const sourceDescription = extractBitrixString(row.SOURCE_DESCRIPTION);
  const additionalInfo = extractBitrixString(row.ADDITIONAL_INFO);
  const description =
    [
      dealListingUrl &&
      dealListingUrl !== sourceWebsite &&
      dealListingUrl !== cimLink &&
      dealListingUrl !== dataRoomLink
        ? `Deal link: ${dealListingUrl}`
        : null,
      listingLocation ? `Location: ${listingLocation}` : null,
      cimLink ? `CIM: ${cimLink}` : null,
      dataRoomLink ? `Data room: ${dataRoomLink}` : null,
      comments,
      sourceDescription,
      additionalInfo,
    ]
      .filter(Boolean)
      .join("\n\n") || null;

  const rawStage = extractBitrixDealListStageIdRaw(row);
  /** Strip `C{CATEGORY_ID}:` using this row's pipeline so `C0:LOSE` → `LOSE` matches stage config. */
  const rowCategoryRaw = row.CATEGORY_ID;
  const rowCategoryId =
    rowCategoryRaw != null && String(rowCategoryRaw).trim() !== ""
      ? String(rowCategoryRaw).trim()
      : BITRIX_DEAL_PIPELINE_ID;
  const normalizedFromApi = rawStage
    ? normalizeBitrixStageIdForPipeline(rawStage, rowCategoryId)
    : "";
  const stage = normalizedFromApi || getDefaultBitrixStageId(stages);

  let brokerFirstName = uf.brokerFirstName.trim()
    ? extractBitrixString(row[uf.brokerFirstName])
    : null;
  let brokerLastName = uf.brokerLastName.trim()
    ? extractBitrixString(row[uf.brokerLastName])
    : null;
  let brokerEmail = uf.brokerEmail.trim()
    ? extractBitrixString(row[uf.brokerEmail])
    : null;
  let brokerPhone = uf.brokerWorkPhone.trim()
    ? extractBitrixString(row[uf.brokerWorkPhone])
    : null;
  const brokerLinkedIn = uf.brokerLinkedIn.trim()
    ? extractBitrixString(row[uf.brokerLinkedIn])
    : null;

  const brokerMissing =
    !brokerFirstName &&
    !brokerLastName &&
    !brokerEmail &&
    !brokerPhone;
  if (brokerMissing && options?.contactById) {
    const cids = extractBitrixDealContactIds(row);
    const primary = cids[0];
    if (primary) {
      const c = options.contactById.get(primary);
      if (c) {
        brokerFirstName = c.firstName;
        brokerLastName = c.lastName;
        brokerEmail = c.email;
        brokerPhone = c.phone;
      }
    }
  }

  const companyIdRaw = row.COMPANY_ID;
  const companyId =
    companyIdRaw != null && String(companyIdRaw).trim() !== ""
      ? String(companyIdRaw).trim()
      : "";
  const brokerage =
    companyId && options?.companyTitleById?.has(companyId)
      ? options.companyTitleById.get(companyId) ?? null
      : null;

  const ebitdaField = resolveBitrixDealEbitdaFieldCode() || "";
  const ebitdaMarginField = resolveBitrixDealEbitdaMarginFieldCode() || "";

  let ebitdaFromUf: number | null = null;
  if (ebitdaField) {
    const raw = row[ebitdaField];
    ebitdaFromUf = coerceBitrixNumeric(raw);
    if (ebitdaFromUf == null) {
      const s = extractBitrixString(raw);
      if (s) ebitdaFromUf = coerceBitrixNumeric(s);
    }
  }

  let ebitdaMarginFromUf: number | null = null;
  if (ebitdaMarginField) {
    const raw = row[ebitdaMarginField];
    ebitdaMarginFromUf = coerceBitrixNumeric(raw);
    if (ebitdaMarginFromUf == null) {
      const s = extractBitrixString(raw);
      if (s) ebitdaMarginFromUf = coerceBitrixNumeric(s);
    }
    if (
      ebitdaMarginFromUf != null &&
      (ebitdaMarginFromUf < 0 || ebitdaMarginFromUf > 100)
    ) {
      ebitdaMarginFromUf = null;
    }
  }

  const teaserForFinancialLines = [title, teaserUfText, comments, sourceDescription]
    .filter((s): s is string => Boolean(s?.trim()))
    .join("\n\n");
  const fromTeaser = parseFinancialLinesFromTeaser(
    teaserForFinancialLines.length > 0 ? teaserForFinancialLines : null,
  );
  let ebitda = ebitdaFromUf ?? fromTeaser.ebitda;
  let ebitdaMargin = ebitdaMarginFromUf ?? fromTeaser.ebitdaMargin;
  const ebitdaParseNotes = [...fromTeaser.debug.notes];
  if (ebitdaField && ebitdaFromUf != null) {
    ebitdaParseNotes.unshift(`ebitda:Bitrix UF ${ebitdaField}=${ebitdaFromUf}`);
  } else if (ebitdaField && ebitdaFromUf == null) {
    ebitdaParseNotes.push(
      `ebitda:UF ${ebitdaField} empty or unparseable (check Bitrix field type / raw shape)`,
    );
  }
  if (ebitdaMarginField && ebitdaMarginFromUf != null) {
    ebitdaParseNotes.unshift(
      `margin:Bitrix UF ${ebitdaMarginField}=${ebitdaMarginFromUf}`,
    );
  }
  const revenueFinal =
    revenue != null && Number.isFinite(revenue) ? revenue : null;
  if (
    ebitda == null &&
    ebitdaMargin != null &&
    revenueFinal != null &&
    revenueFinal > 0
  ) {
    ebitda = revenueFinal * (ebitdaMargin / 100);
    ebitdaParseNotes.push(
      `ebitda:implied=revenue*margin/100 revenue=${revenueFinal} margin=${ebitdaMargin}`,
    );
  }

  return {
    bitrixId,
    stage,
    title,
    dealTeaser: teaserUfText,
    description,
    sourceWebsite,
    revenue: revenueFinal,
    ebitda,
    ebitdaMargin,
    ebitdaParseDebug: { notes: ebitdaParseNotes },
    askingPrice:
      askingPrice != null && Number.isFinite(askingPrice) ? askingPrice : null,
    brokerFirstName,
    brokerLastName,
    brokerEmail,
    brokerPhone,
    brokerLinkedIn,
    brokerage: brokerage?.trim() ? brokerage.trim() : null,
    companyLocation: listingLocation,
    cimLink,
    dataRoomLink,
    bitrixCreatedAt: parseBitrixDate(row.DATE_CREATE),
  };
}

/**
 * All deals in the configured CRM pipeline (`BITRIX_DEAL_PIPELINE_ID`), paginated via `callBitrixListAll`.
 * Uses {@link buildDealListSelectForImportPipeline} so configured `UF_CRM_*` fields (teaser, deal link, revenue, files, …) are present;
 * add more field codes via `BITRIX_DEAL_LIST_UF_EXTRA` if needed.
 */
export async function fetchDealsForSyncPipeline(options?: {
  webhookBaseUrl?: string;
}): Promise<Record<string, unknown>[]> {
  const select = buildDealListSelectForImportPipeline();
  return callBitrixListAll<Record<string, unknown>>(
    "crm.deal.list",
    {
      filter: { CATEGORY_ID: BITRIX_DEAL_PIPELINE_ID },
      select,
    },
    options,
  );
}
