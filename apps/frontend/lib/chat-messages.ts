import type { UIMessage } from "ai";

export function coerceStoredMessages(value: unknown): UIMessage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value as UIMessage[];
}
