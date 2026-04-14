export function resolveOpenAIApiKey(): string | undefined {
  return (
    process.env.OPENAI_API_KEY || process.env.AI_API_KEY || undefined
  );
}

export function resolveGoogleGeminiApiKey(): string | undefined {
  return (
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ??
    process.env.GOOGLE_AI_API_KEY ??
    process.env.GEMINI_API_KEY ??
    undefined
  );
}

export function requireOpenAIApiKey(): string {
  const key = resolveOpenAIApiKey();
  if (!key) {
    throw new Error("OpenAI API key not configured");
  }
  return key;
}

export function requireGoogleGeminiApiKey(): string {
  const key = resolveGoogleGeminiApiKey();
  if (!key) {
    throw new Error("Google AI API key not configured");
  }
  return key;
}
