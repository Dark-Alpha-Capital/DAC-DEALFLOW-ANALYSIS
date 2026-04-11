import { resolveBitrixDealTeaserFieldCode } from "./deal-fields-catalog";
import { formatDealUfPayloadValue } from "./deal-field-format";
import { getBitrixOpportunitySyncUfCodes } from "./opportunity-uf";

export {
  BITRIX_UF,
  BITRIX_UF_DEFAULTS,
  getBitrixOpportunitySyncUfCodes,
} from "./opportunity-uf";
export type { BitrixOpportunityUfDefaults } from "./opportunity-uf";

export const BITRIX_ORIGINATOR_ID = "DARK_ALPHA_APP";

export type OpportunitySyncPayload = {
  dealOpportunityId: string;
  /** Bitrix deal pipeline id; omit for portal default pipeline (legacy behavior). */
  categoryId?: string;
  /** Bitrix kanban stage id; omit if not configured (legacy behavior). */
  stageId?: string;
  title: string;
  opportunity: number;
  currencyId?: string;
  comments?: string | null;
  sourceWebsite?: string | null;
  companyLocation?: string | null;
  industry?: string | null;
  ebitda?: number | null;
  ebitdaMargin?: number | null;
  brokerFirstName?: string | null;
  brokerLastName?: string | null;
  brokerEmail?: string | null;
  brokerPhone?: string | null;
  brokerLinkedIn?: string | null;
  askingPrice?: number | null;
  /** TTM / company revenue for UF revenue when set; otherwise UF mirrors `opportunity`. */
  revenue?: number | null;
  /** Short teaser line; merged into COMMENTS and/or dedicated teaser UF. */
  teaser?: string | null;
  /** Longer narrative merged into COMMENTS and/or dedicated teaser UF. */
  description?: string | null;
};

function stripEmpty(
  fields: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(fields).filter(
      ([, v]) => v !== undefined && v !== null && v !== "",
    ),
  );
}

const MAX_TEASER_UF_CHARS = 60_000;

/** Teaser UF: teaser + description + free-form comments (single narrative block). */
function buildCombinedTeaserForUf(input: OpportunitySyncPayload): string | undefined {
  const parts = [
    input.teaser?.trim() || null,
    input.description?.trim() || null,
    input.comments?.trim() || null,
  ].filter(Boolean) as string[];
  if (parts.length === 0) return undefined;
  let text = parts.join("\n\n");
  if (text.length > MAX_TEASER_UF_CHARS) {
    text = `${text.slice(0, MAX_TEASER_UF_CHARS)}\n\n[Truncated…]`;
  }
  return text;
}

function setUf(
  raw: Record<string, unknown>,
  code: string,
  value: unknown,
  currencyId: string,
) {
  const id = code.trim();
  if (!id) return;
  if (value === undefined || value === null) return;
  if (typeof value === "string" && value.trim() === "") return;
  raw[id] = formatDealUfPayloadValue(id, value, currencyId);
}

/** Maps confirmed form values to Bitrix `crm.deal.add` / `crm.deal.update` `fields`. */
export function buildCrmDealFieldsFromOpportunitySync(
  input: OpportunitySyncPayload,
): Record<string, unknown> {
  const uf = getBitrixOpportunitySyncUfCodes();
  const currencyId = input.currencyId ?? "USD";
  const teaserFieldCode = resolveBitrixDealTeaserFieldCode()?.trim() || "";
  const ufNarrativeBody = buildCombinedTeaserForUf(input);

  const narrativeCommentsNoUf = [
    input.teaser?.trim() ? `Teaser: ${input.teaser.trim()}` : null,
    input.description?.trim() || null,
    input.comments?.trim() || null,
  ].filter(Boolean) as string[];

  const brokerBits = [
    [input.brokerFirstName, input.brokerLastName]
      .map((s) => s?.trim())
      .filter(Boolean)
      .join(" "),
    input.brokerEmail?.trim() || null,
    input.brokerPhone?.trim() || null,
    input.brokerLinkedIn?.trim() || null,
  ].filter(Boolean) as string[];
  const brokerLine = brokerBits.length > 0 ? brokerBits.join(" · ") : null;

  const extraCommentParts = [
    input.industry != null && input.industry.trim() !== ""
      ? `Industry: ${input.industry.trim()}`
      : null,
    input.ebitda != null && !Number.isNaN(input.ebitda)
      ? `EBITDA: ${input.ebitda}`
      : null,
    input.ebitdaMargin != null && !Number.isNaN(input.ebitdaMargin)
      ? `EBITDA Margin: ${input.ebitdaMargin}`
      : null,
    brokerLine ? `Broker: ${brokerLine}` : null,
  ].filter(Boolean) as string[];

  let comments: string | undefined;
  if (teaserFieldCode) {
    if (ufNarrativeBody) {
      comments =
        extraCommentParts.length > 0
          ? extraCommentParts.join("\n\n")
          : undefined;
    } else {
      const block = [...narrativeCommentsNoUf, ...extraCommentParts];
      comments = block.length > 0 ? block.join("\n\n") : undefined;
    }
  } else {
    const block = [...narrativeCommentsNoUf, ...extraCommentParts];
    comments = block.length > 0 ? block.join("\n\n") : undefined;
  }

  const revenueForUf =
    input.revenue != null && !Number.isNaN(Number(input.revenue))
      ? Number(input.revenue)
      : input.opportunity;

  const rawFields: Record<string, unknown> = {
    TITLE: input.title,
    OPPORTUNITY: input.opportunity,
    CURRENCY_ID: currencyId,
    COMMENTS: comments,
    ORIGINATOR_ID: BITRIX_ORIGINATOR_ID,
    ORIGIN_ID: input.dealOpportunityId,
  };

  setUf(rawFields, uf.revenue, revenueForUf, currencyId);
  setUf(rawFields, uf.sourceWebsite, input.sourceWebsite ?? undefined, currencyId);
  setUf(
    rawFields,
    uf.companyLocation,
    input.companyLocation ?? undefined,
    currencyId,
  );
  setUf(rawFields, uf.brokerFirstName, input.brokerFirstName ?? undefined, currencyId);
  setUf(rawFields, uf.brokerLastName, input.brokerLastName ?? undefined, currencyId);
  setUf(rawFields, uf.brokerEmail, input.brokerEmail ?? undefined, currencyId);
  setUf(rawFields, uf.brokerLinkedIn, input.brokerLinkedIn ?? undefined, currencyId);
  setUf(rawFields, uf.brokerWorkPhone, input.brokerPhone ?? undefined, currencyId);

  if (input.categoryId?.trim()) {
    rawFields.CATEGORY_ID = input.categoryId.trim();
  }
  if (input.stageId?.trim()) {
    rawFields.STAGE_ID = input.stageId.trim();
  }

  if (input.askingPrice != null && !Number.isNaN(input.askingPrice)) {
    setUf(rawFields, uf.askingPrice, input.askingPrice, currencyId);
  }

  if (teaserFieldCode && ufNarrativeBody) {
    rawFields[teaserFieldCode] = ufNarrativeBody;
  }

  return stripEmpty(rawFields);
}

/** Legacy `Deal` row export (raw deals table) — same UF mapping as historical `upload-bitrix`. */
export type LegacyRawDealBitrixInput = {
  id: string;
  dealCaption: string;
  revenue: number;
  sourceWebsite: string;
  companyLocation: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  linkedinUrl: string | null;
  workPhone: string | null;
  industry: string;
  ebitda: number;
  ebitdaMargin: number;
  askingPrice: number | null;
};

export function buildCrmDealFieldsFromLegacyRawDeal(
  deal: LegacyRawDealBitrixInput,
  options?: { categoryId?: string; stageId?: string },
): Record<string, unknown> {
  return buildCrmDealFieldsFromOpportunitySync({
    dealOpportunityId: deal.id,
    categoryId: options?.categoryId,
    stageId: options?.stageId,
    title: deal.dealCaption,
    opportunity: Number(deal.revenue),
    sourceWebsite: deal.sourceWebsite || null,
    companyLocation: deal.companyLocation,
    industry: deal.industry,
    ebitda: deal.ebitda,
    ebitdaMargin: deal.ebitdaMargin,
    brokerFirstName: deal.firstName,
    brokerLastName: deal.lastName,
    brokerEmail: deal.email,
    brokerLinkedIn: deal.linkedinUrl,
    brokerPhone: deal.workPhone,
    askingPrice: deal.askingPrice,
  });
}
