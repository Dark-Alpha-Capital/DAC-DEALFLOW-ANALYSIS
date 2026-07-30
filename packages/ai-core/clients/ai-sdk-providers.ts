import type { LanguageModel } from "ai";
import { createGoogle } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import {
  requireGoogleGeminiApiKey,
  requireOpenAIApiKey,
} from "../env";

let _openaiProvider: ReturnType<typeof createOpenAI> | null = null;
let _googleProvider: ReturnType<typeof createGoogle> | null = null;

export function getOpenAIProvider(): ReturnType<typeof createOpenAI> {
  if (!_openaiProvider) {
    _openaiProvider = createOpenAI({ apiKey: requireOpenAIApiKey() });
  }
  return _openaiProvider;
}

export function getGoogleProvider(): ReturnType<
  typeof createGoogle
> {
  if (!_googleProvider) {
    _googleProvider = createGoogle({
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
  return createGoogle({ apiKey: requireGoogleGeminiApiKey() })(
    model
  );
}
