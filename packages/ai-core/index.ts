export {
  resolveOpenAIApiKey,
  resolveGoogleGeminiApiKey,
} from "./env";

export { getOpenAIClient } from "./clients/openai-sdk";
export {
  getOpenAIProvider,
  getChatLanguageModel,
  type ChatProvider,
} from "./clients/ai-sdk-providers";

export {
  buildFullChatSystemPrompt,
  buildScreenDealChunkPrompt,
  buildScreenDealSummaryPrompt,
  QUALITATIVE_SCREENING_PROMPT,
  CIM_EXTRACTION_SYSTEM,
  CIM_EXTRACTION_USER,
  buildCimScreeningQuestionPrompt,
  BITRIX_DEAL_OPPORTUNITY_EXTRACTION_SYSTEM,
  PROJECT_KICKOFF_EXTRACTION_SYSTEM,
  PROJECT_KICKOFF_SCREENING_SYSTEM,
  buildProjectKickoffScreeningPrompt,
  DARK_ALPHA_CRITERIA,
  IC_SCORER_MEMO_SYSTEM,
  buildIcScorerScoreSystem,
  buildIcScorerUserPrompt,
  buildIcScorerMemoUserPrompt,
  type IcScorerEvidenceExcerpt,
} from "./prompts";
