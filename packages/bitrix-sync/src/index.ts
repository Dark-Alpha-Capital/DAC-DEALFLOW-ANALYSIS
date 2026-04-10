export {
  callBitrix,
  type BitrixSuccess,
  type BitrixErrorBody,
} from "./client";
export {
  BITRIX_DEAL_PIPELINE_ID,
  getBitrixSyncEnv,
  getBitrixDealTeaserFieldCode,
  requireBitrixWebhookBase,
  buildBitrixDealDetailUrl,
  inferPortalBaseFromWebhook,
  type BitrixSyncEnv,
} from "./env";
export {
  buildCrmDealFieldsFromOpportunitySync,
  buildCrmDealFieldsFromLegacyRawDeal,
  BITRIX_UF,
  BITRIX_ORIGINATOR_ID,
  type OpportunitySyncPayload,
  type LegacyRawDealBitrixInput,
} from "./deal-fields";
export {
  getBitrixDealStages,
  suggestBitrixStageIdForAppStage,
  type BitrixDealStageRow,
} from "./stages";
export {
  bitrixDealOpportunityExtractionSchema,
  type BitrixDealOpportunityExtraction,
} from "./deal-extraction-schema";
export {
  getBitrixDealFieldsCatalog,
  getAiBitrixFormFieldMeta,
  normalizeBitrixDealFieldsResult,
  type BitrixDealFieldRow,
  type BitrixDealFieldsFile,
  type AiBitrixFormFieldKey,
} from "./deal-fields-catalog";
