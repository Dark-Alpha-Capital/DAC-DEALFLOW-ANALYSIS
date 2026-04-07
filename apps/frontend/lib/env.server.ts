import { z } from "zod";

/**
 * Server-only environment variables (validated once per process).
 * Do not import this module from client-only code.
 */
const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).optional(),
  /** Base URL for server-side fetch to this app (no trailing slash). */
  FRONTEND_URL: z.string().min(1).optional(),
  GTM_LEADS_API_KEY: z.string().optional(),
  DEAL_QUICK_ADD_API_KEY: z.string().optional(),
  INVESTOR_LEADS_API_KEY: z.string().optional(),
  BITRIX_DEAL_CATEGORY_ID: z.string().optional(),
  BITRIX_DEFAULT_STAGE_ID: z.string().optional(),
  BETTER_AUTH_URL: z.string().optional(),
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().optional(),
  CHAT_TOOL_STRICT_MODE: z.string().optional(),
  CHAT_TOOL_ACTIVE_GATING: z.string().optional(),
  CHAT_TOOL_DEBUG_LOGS: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (cached) return cached;
  cached = serverEnvSchema.parse({
    NODE_ENV: process.env.NODE_ENV,
    FRONTEND_URL: process.env.FRONTEND_URL,
    GTM_LEADS_API_KEY: process.env.GTM_LEADS_API_KEY,
    DEAL_QUICK_ADD_API_KEY: process.env.DEAL_QUICK_ADD_API_KEY,
    INVESTOR_LEADS_API_KEY: process.env.INVESTOR_LEADS_API_KEY,
    BITRIX_DEAL_CATEGORY_ID: process.env.BITRIX_DEAL_CATEGORY_ID,
    BITRIX_DEFAULT_STAGE_ID: process.env.BITRIX_DEFAULT_STAGE_ID,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID,
    AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
    CHAT_TOOL_STRICT_MODE: process.env.CHAT_TOOL_STRICT_MODE,
    CHAT_TOOL_ACTIVE_GATING: process.env.CHAT_TOOL_ACTIVE_GATING,
    CHAT_TOOL_DEBUG_LOGS: process.env.CHAT_TOOL_DEBUG_LOGS,
  });
  return cached;
}

/** Base URL for same-origin API calls during SSR (tRPC, etc.). */
export function getSsrAppBaseUrl(): string {
  const env = getServerEnv();
  const trimmed = env.FRONTEND_URL?.replace(/\/$/, "");
  if (trimmed) return trimmed;
  return "http://localhost:3000";
}
