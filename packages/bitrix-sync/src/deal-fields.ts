/**
 * Custom field codes shared with legacy raw-deal → Bitrix export.
 * Confirm in Bitrix24 CRM → Settings → CRM → Fields before changing.
 */
export const BITRIX_UF = {
  revenue: "UF_CRM_1715146259470",
  sourceWebsite: "UF_CRM_1715146404315",
  companyLocation: "UF_CRM_1711453168658",
  brokerFirstName: "UF_CRM_FIRST_NAME",
  brokerLastName: "UF_CRM_LAST_NAME",
  brokerEmail: "UF_CRM_EMAIL",
  brokerLinkedIn: "UF_CRM_LINKEDIN_URL",
  brokerWorkPhone: "UF_CRM_WORK_PHONE",
  askingPrice: "UF_CRM_1727869474151",
} as const;

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

/** Maps confirmed form values to Bitrix `crm.deal.add` / `crm.deal.update` `fields`. */
export function buildCrmDealFieldsFromOpportunitySync(
  input: OpportunitySyncPayload,
): Record<string, unknown> {
  const currencyId = input.currencyId ?? "USD";
  const commentParts = [
    input.industry != null && input.industry !== ""
      ? `Industry: ${input.industry}`
      : null,
    input.ebitda != null && !Number.isNaN(input.ebitda)
      ? `EBITDA: ${input.ebitda}`
      : null,
    input.ebitdaMargin != null && !Number.isNaN(input.ebitdaMargin)
      ? `EBITDA Margin: ${input.ebitdaMargin}`
      : null,
    input.comments?.trim() ? input.comments.trim() : null,
  ].filter(Boolean);
  const comments =
    commentParts.length > 0 ? commentParts.join(" | ") : undefined;

  const rawFields: Record<string, unknown> = {
    TITLE: input.title,
    OPPORTUNITY: input.opportunity,
    CURRENCY_ID: currencyId,
    [BITRIX_UF.revenue]: input.opportunity,
    [BITRIX_UF.sourceWebsite]: input.sourceWebsite ?? undefined,
    [BITRIX_UF.companyLocation]: input.companyLocation ?? undefined,
    [BITRIX_UF.brokerFirstName]: input.brokerFirstName ?? undefined,
    [BITRIX_UF.brokerLastName]: input.brokerLastName ?? undefined,
    [BITRIX_UF.brokerEmail]: input.brokerEmail ?? undefined,
    [BITRIX_UF.brokerLinkedIn]: input.brokerLinkedIn ?? undefined,
    [BITRIX_UF.brokerWorkPhone]: input.brokerPhone ?? undefined,
    COMMENTS: comments,
    ORIGINATOR_ID: BITRIX_ORIGINATOR_ID,
    ORIGIN_ID: input.dealOpportunityId,
  };

  if (input.categoryId?.trim()) {
    rawFields.CATEGORY_ID = input.categoryId.trim();
  }
  if (input.stageId?.trim()) {
    rawFields.STAGE_ID = input.stageId.trim();
  }

  if (input.askingPrice != null && !Number.isNaN(input.askingPrice)) {
    rawFields[BITRIX_UF.askingPrice] = {
      VALUE: Number(input.askingPrice),
      CURRENCY: currencyId,
    };
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
