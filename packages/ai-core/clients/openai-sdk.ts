import OpenAI from "openai";
import { requireOpenAIApiKey } from "../env";

let _client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({ apiKey: requireOpenAIApiKey() });
  }
  return _client;
}
