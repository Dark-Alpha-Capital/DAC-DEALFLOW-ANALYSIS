export {
  callBitrix,
  callBitrixListAll,
  type BitrixSuccess,
  type BitrixErrorBody,
} from "./client";
export {
  BITRIX_DEAL_PIPELINE_ID,
  getBitrixSyncEnv,
  requireBitrixWebhookBase,
  buildBitrixDealDetailUrl,
  inferPortalBaseFromWebhook,
  type BitrixSyncEnv,
} from "./env";
export {
  buildCrmDealFieldsFromOpportunitySync,
  buildCrmDealFieldsFromLegacyRawDeal,
  BITRIX_ORIGINATOR_ID,
  type OpportunitySyncPayload,
  type LegacyRawDealBitrixInput,
} from "./deal-fields";
export {
  coerceBitrixNumeric,
  parseBitrixMoneyParts,
  formatBitrixMoneyForDisplay,
} from "./money";
export {
  defaultBitrixStageId,
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

