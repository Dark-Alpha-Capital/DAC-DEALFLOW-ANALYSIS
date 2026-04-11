import db, {
  companies,
  eq,
  and,
  isNull,
} from "@repo/db";
import {
  GetDealOpportunityById,
  GetDealOpportunityByLegacyDealId,
  GetLatestDealFinancialSnapshotByDealOpportunityId,
} from "@repo/db/queries";
import {
  BITRIX_DEAL_PIPELINE_ID,
  getBitrixDealStages,
  getBitrixSyncEnv,
  getDefaultBitrixStageId,
  inferPortalBaseFromWebhook,
  normalizeBitrixStageIdForPipeline,
} from "@repo/bitrix-sync";

export type BitrixSyncPreviewData = {
  webhookConfigured: boolean;
  portalBaseUrl: string;
  dealCategoryId: string;
  stages: ReturnType<typeof getBitrixDealStages>;
  suggestedStageId: string;
  appStage: string;
  existingBitrixId: string | null;
  existingBitrixLink: string | null;
  defaultForm: {
    title: string;
    stageId: string;
    opportunity: number;
    currencyId: string;
    comments: string;
    sourceWebsite: string;
    companyLocation: string;
    industry: string;
    brokerFirstName: string;
    brokerLastName: string;
    brokerEmail: string;
    brokerPhone: string;
    brokerLinkedIn: string;
    askingPrice: number | null;
    ebitda: number;
    ebitdaMargin: number;
    /** Maps to Bitrix teaser UF when configured */
    teaser: string;
  };
};

export async function getBitrixSyncPreviewData(
  dealOpportunityId: string,
): Promise<
  | { success: true; data: BitrixSyncPreviewData }
  | { success: false; message: string }
> {
  let opp = await GetDealOpportunityById(dealOpportunityId);
  if (!opp) {
    opp = await GetDealOpportunityByLegacyDealId(dealOpportunityId);
  }
  if (!opp) {
    return { success: false, message: "Deal opportunity not found" };
  }

  const company = opp.companyId
    ? (
        await db
          .select()
          .from(companies)
          .where(
            and(eq(companies.id, opp.companyId), isNull(companies.deletedAt)),
          )
          .limit(1)
      )[0]
    : undefined;

  const latestSnapshot =
    await GetLatestDealFinancialSnapshotByDealOpportunityId(opp.id);

  const resolvedRevenue =
    latestSnapshot?.revenue ??
    opp.revenue ??
    company?.revenueEstimate ??
    0;
  const resolvedEbitda =
    latestSnapshot?.ebitda ?? opp.ebitda ?? company?.ebitdaEstimate ?? 0;
  const resolvedEbitdaMargin =
    latestSnapshot?.ebitdaMargin ??
    opp.ebitdaMargin ??
    company?.ebitdaMarginEstimate ??
    0;
  const resolvedAskingPrice =
    latestSnapshot?.askingPrice ?? opp.askingPrice ?? null;

  const defaultTitle =
    opp.title?.trim() ||
    company?.name?.trim() ||
    opp.dealTeaser?.trim() ||
    "Deal opportunity";
  const defaultTeaser = opp.dealTeaser?.trim() ?? "";

  const env = getBitrixSyncEnv();
  const stages = getBitrixDealStages();
  const stageIds = new Set(stages.map((s) => s.statusId));
  const fallback =
    env?.defaultStageId?.trim() || getDefaultBitrixStageId(stages);
  const pipelineCat =
    env?.dealCategoryId?.trim() || BITRIX_DEAL_PIPELINE_ID;
  const rawStage = opp.stage?.trim() ?? "";
  const canonicalStage = normalizeBitrixStageIdForPipeline(
    rawStage,
    pipelineCat,
  );
  const suggestedStageId = stageIds.has(canonicalStage)
    ? canonicalStage
    : stageIds.has(rawStage)
      ? rawStage
      : fallback;

  const portalBase =
    env?.portalBaseUrl?.trim() ||
    (env?.webhookBaseUrl ? inferPortalBaseFromWebhook(env.webhookBaseUrl) : "");

  const data: BitrixSyncPreviewData = {
    webhookConfigured: Boolean(env?.webhookBaseUrl),
    portalBaseUrl: portalBase,
    dealCategoryId: env?.dealCategoryId ?? "",
    stages,
    suggestedStageId,
    appStage: opp.stage,
    existingBitrixId: opp.bitrixId,
    existingBitrixLink: opp.bitrixLink,
    defaultForm: {
      title: defaultTitle,
      stageId: suggestedStageId,
      opportunity: Number(resolvedRevenue) || 0,
      currencyId: "USD",
      comments: opp.description ?? "",
      sourceWebsite: opp.sourceWebsite ?? "",
      companyLocation: company?.location ?? "",
      industry: company?.industry ?? "",
      brokerFirstName: opp.brokerFirstName ?? "",
      brokerLastName: opp.brokerLastName ?? "",
      brokerEmail: opp.brokerEmail ?? "",
      brokerPhone: opp.brokerPhone ?? "",
      brokerLinkedIn: opp.brokerLinkedIn ?? "",
      askingPrice: resolvedAskingPrice,
      ebitda: resolvedEbitda,
      ebitdaMargin: resolvedEbitdaMargin,
      teaser: defaultTeaser,
    },
  };

  return { success: true, data };
}
