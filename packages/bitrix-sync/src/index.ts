export {
  callBitrix,
  type BitrixSuccess,
  type BitrixErrorBody,
} from "./client";
export {
  getBitrixSyncEnv,
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
