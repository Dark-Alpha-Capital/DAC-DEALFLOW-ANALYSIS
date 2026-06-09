export {
  resolveOpenAIApiKey,
  resolveGoogleGeminiApiKey,
  requireOpenAIApiKey,
  requireGoogleGeminiApiKey,
} from "./env";

export { getGoogleGenAI } from "./clients/google-genai";
export { getOpenAIClient } from "./clients/openai-sdk";
export {
  getOpenAIProvider,
  getGoogleGenerativeAIProvider,
  getChatLanguageModel,
  type ChatProvider,
} from "./clients/ai-sdk-providers";

export { COMPANY_DUE_DILIGENCE_DOCUMENTS_STORE_NAME } from "./constants";

export {
  buildDiligenceSystemPrompt,
  buildChatToolRoutingPrompt,
  buildFullChatSystemPrompt,
  SCREENER_CHUNK_SYSTEM,
  buildScreenDealChunkPrompt,
  buildScreenDealSummaryPrompt,
  QUALITATIVE_SCREENING_PROMPT,
  CIM_EXTRACTION_SYSTEM,
  CIM_EXTRACTION_USER,
  AI_DEAL_SCREENING_INSTRUCTIONS,
  buildCimScreeningQuestionPrompt,
  BITRIX_DEAL_OPPORTUNITY_EXTRACTION_SYSTEM,
  PROJECT_KICKOFF_EXTRACTION_SYSTEM,
  PROJECT_KICKOFF_SCREENING_SYSTEM,
  buildProjectKickoffScreeningPrompt,
  type ProjectKickoffScreeningInput,
  type DepartmentScreenerInput,
  DARK_ALPHA_CRITERIA,
  IC_SCORER_SYSTEM,
  IC_SCORER_SCORE_SYSTEM,
  IC_SCORER_MEMO_SYSTEM,
  IC_SCORER_PROMPT_VERSION,
  buildIcScorerUserPrompt,
  buildIcScorerMemoUserPrompt,
  type IcScorerPromptInput,
  type IcScorerEvidenceExcerpt,
} from "./prompts";
