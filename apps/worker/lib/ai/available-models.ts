import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import { createOpenAI } from "@ai-sdk/openai";

export const openaiClient = new OpenAI({
  apiKey: process.env.AI_API_KEY,
});

export const openai = createOpenAI({
  apiKey: process.env.AI_API_KEY,
});

export const COMPANY_DUE_DILIGENCE_DOCUMENTS_STORE_NAME =
  "fileSearchStores/companyduediligencedocument-ote1yx8yepjw";

// The client gets the API key from the environment variable `GOOGLE_AI_API_KEY`.
export const googleGenAI = new GoogleGenAI({
  apiKey: process.env.GOOGLE_AI_API_KEY,
});
