import type { UIMessage } from "ai";

type LegacyMessage = Record<string, unknown>;

function normalizeOne(raw: unknown, index: number): UIMessage {
  if (!raw || typeof raw !== "object") {
    return {
      id: `invalid-${index}`,
      role: "user",
      parts: [{ type: "text", text: "" }],
    };
  }

  const m = raw as LegacyMessage;
  const id =
    typeof m.id === "string" && m.id.length > 0 ? m.id : `msg-${index}`;
  const role =
    m.role === "user" || m.role === "assistant" || m.role === "system"
      ? m.role
      : "user";

  let parts: UIMessage["parts"] = [];
  if (Array.isArray(m.parts) && m.parts.length > 0) {
    parts = m.parts as UIMessage["parts"];
  } else {
    const built: UIMessage["parts"] = [];
    if (typeof m.reasoning === "string" && m.reasoning.trim()) {
      built.push({ type: "reasoning", text: m.reasoning });
    }
    if (typeof m.content === "string" && m.content.length > 0) {
      built.push({ type: "text", text: m.content });
    }
    parts = built;
  }

  const base: UIMessage = {
    id,
    role,
    parts,
  };

  if (m.metadata !== undefined) {
    return { ...base, metadata: m.metadata } as UIMessage;
  }

  return base;
}

/** Ensures DB JSON matches current UIMessage shape (parts-based; legacy used `content`). */
export function coerceStoredMessages(value: unknown): UIMessage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(normalizeOne);
}
