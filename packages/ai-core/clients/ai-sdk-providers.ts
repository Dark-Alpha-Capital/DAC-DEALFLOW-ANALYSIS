import type { LanguageModel } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import {
  requireGoogleGeminiApiKey,
  requireOpenAIApiKey,
} from "../env";

let _openaiProvider: ReturnType<typeof createOpenAI> | null = null;
let _googleProvider: ReturnType<typeof createGoogleGenerativeAI> | null = null;

export function getOpenAIProvider(): ReturnType<typeof createOpenAI> {
  if (!_openaiProvider) {
    _openaiProvider = createOpenAI({ apiKey: requireOpenAIApiKey() });
  }
  return _openaiProvider;
}

export function getGoogleGenerativeAIProvider(): ReturnType<
  typeof createGoogleGenerativeAI
> {
  if (!_googleProvider) {
    _googleProvider = createGoogleGenerativeAI({
      apiKey: requireGoogleGeminiApiKey(),
    });
  }
  return _googleProvider;
}

export type ChatProvider = "openai" | "google";

export function getChatLanguageModel(
  provider: ChatProvider,
  model: string
): LanguageModel {
  if (provider === "openai") {
    return createOpenAI({ apiKey: requireOpenAIApiKey() })(model);
  }
  return createGoogleGenerativeAI({ apiKey: requireGoogleGeminiApiKey() })(
    model
  );
}
