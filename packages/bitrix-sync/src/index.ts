export {
  callBitrix,
  callBitrixListAll,
  type BitrixSuccess,
  type BitrixErrorBody,
} from "./client";
export {
  BITRIX_DEAL_PIPELINE_ID,
  getBitrixSyncEnv,
  getBitrixDealTeaserFieldCode,
  getBitrixDealEbitdaFieldCode,
  getBitrixDealEbitdaMarginFieldCode,
  requireBitrixWebhookBase,
  buildBitrixDealDetailUrl,
  inferPortalBaseFromWebhook,
  injectWebhookAuthIntoCrmUrl,
  resolveBitrixPortalUrl,
  type BitrixSyncEnv,
} from "./env";
export {
  buildCrmDealFieldsFromOpportunitySync,
  buildCrmDealFieldsFromLegacyRawDeal,
  resolveBitrixOpportunityAmount,
  BITRIX_UF,
  BITRIX_UF_DEFAULTS,
  getBitrixOpportunitySyncUfCodes,
  BITRIX_ORIGINATOR_ID,
  type OpportunitySyncPayload,
  type LegacyRawDealBitrixInput,
  type BitrixOpportunityUfDefaults,
} from "./deal-fields";
export {
  getBitrixDealStages,
  getDefaultBitrixStageId,
  normalizeBitrixStageIdForPipeline,
  resolveBitrixStageLabel,
  type BitrixDealStageRow,
} from "./stages";
export {
  bitrixDealOpportunityExtractionSchema,
  type BitrixDealOpportunityExtraction,
} from "./deal-extraction-schema";
export {
  getBitrixDealFieldsCatalog,
  getAiBitrixFormFieldMeta,
  mergeBitrixDealFieldRows,
  normalizeBitrixDealFieldsResult,
  normalizeBitrixDealUserfieldListItem,
  resolveBitrixDealTeaserFieldCode,
  resolveBitrixDealEbitdaFieldCode,
  resolveBitrixDealEbitdaMarginFieldCode,
  type BitrixDealFieldRow,
  type BitrixDealFieldsFile,
  type AiBitrixFormFieldKey,
} from "./deal-fields-catalog";
export {
  buildDealListSelect,
  buildDealListSelectForImportPipeline,
  coerceBitrixNumeric,
  formatBitrixMoneyForDisplay,
  parseBitrixMoneyParts,
  extractBitrixDealCompanyId,
  extractBitrixDealContactIds,
  extractBitrixDealListStageIdRaw,
  extractBitrixString,
  formatBitrixAddressValue,
  fetchBitrixCompanyTitleMap,
  fetchBitrixContactBrokerMap,
  fetchDealsForSyncPipeline,
  normalizeBitrixListRow,
  parseFinancialLinesFromTeaser,
  type BitrixContactBrokerFields,
  type NormalizedBitrixDealImport,
} from "./import-deal-from-bitrix-list";
