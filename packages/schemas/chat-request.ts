import { z } from "zod";

/** Minimal structural type for AI SDK-style chat messages (validated at API boundary). */
export type ChatUiMessage = {
  id: string;
  role: string;
  parts: unknown[];
};

export const chatProviderSchema = z.enum(["openai", "google"]);

export const chatContextSchema = z
  .object({
    companyId: z.string().nullable().optional(),
    leadId: z.string().nullable().optional(),
    dealOpportunityId: z.string().nullable().optional(),
  })
  .optional();

export const chatUiMessageSchema: z.ZodType<ChatUiMessage> = z.custom<ChatUiMessage>(
  (val): val is ChatUiMessage => {
    if (typeof val !== "object" || val === null) return false;
    const m = val as Record<string, unknown>;
    return (
      typeof m.id === "string" &&
      typeof m.role === "string" &&
      Array.isArray(m.parts)
    );
  },
  { message: "message must include id, role, and parts[]" },
);

export const chatRequestBodySchema = z.object({
  id: z.string().min(1, "Chat id is required"),
  message: chatUiMessageSchema,
  model: z.string().min(1, "Model is required"),
  provider: chatProviderSchema.optional(),
  context: chatContextSchema,
});

export type ChatRequestBody = z.infer<typeof chatRequestBodySchema>;
