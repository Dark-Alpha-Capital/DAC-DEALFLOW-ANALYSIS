export {
  getGoogleGenAI,
  getOpenAIClient,
  getOpenAIProvider,
  COMPANY_DUE_DILIGENCE_DOCUMENTS_STORE_NAME,
} from "@repo/ai-core";

import {
  getGoogleGenAI,
  getOpenAIClient,
  getOpenAIProvider,
} from "@repo/ai-core";

export const openai = getOpenAIProvider();
export const openaiClient = getOpenAIClient();
export const googleGenAI = getGoogleGenAI();
