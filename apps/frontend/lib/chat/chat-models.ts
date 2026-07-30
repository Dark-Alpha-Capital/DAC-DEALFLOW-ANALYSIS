export const CHAT_MODELS = {
  openai: [
    { label: "GPT-5 Mini", value: "gpt-5-mini" },
    { label: "GPT-4.1 Mini", value: "gpt-4.1-mini" },
  ],
  google: [
    { label: "Gemini 2.5 Flash", value: "gemini-2.5-flash" },
    { label: "Gemini 2.0 Flash", value: "gemini-2.0-flash" },
  ],
} as const;

export type ChatProvider = keyof typeof CHAT_MODELS;
export type ChatSelection = `${ChatProvider}:${string}`;

export const DEFAULT_CHAT_PROVIDER: ChatProvider = "openai";
export const DEFAULT_CHAT_MODEL = "gpt-5-mini";
export const DEFAULT_CHAT_SELECTION: ChatSelection = "openai:gpt-5-mini";

export function isAllowedModel(provider: ChatProvider, model: string): boolean {
  return CHAT_MODELS[provider].some((entry) => entry.value === model);
}

export function getSelectionFromProviderAndModel(
  provider: string,
  model: string,
): ChatSelection {
  if (
    (provider === "openai" || provider === "google") &&
    isAllowedModel(provider, model)
  ) {
    return `${provider}:${model}`;
  }

  return DEFAULT_CHAT_SELECTION;
}
