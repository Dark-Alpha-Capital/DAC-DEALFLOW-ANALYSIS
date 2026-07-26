import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import type { IcScorerBootstrapInput } from "@/lib/ic-scorer-bootstrap-types";

export type {
  IcScorerBootstrapFieldRow,
  IcScorerBootstrapInput,
  IcScorerBootstrapPayload,
  IcScorerBootstrapPrefetchHint,
  IcScorerDealDocumentRow,
  IcScorerRecentRunRow,
} from "@/lib/ic-scorer-bootstrap-types";

/** Same shape as `bitrixWidgetContextAuthSchema` — kept local so this file stays free of `@repo/db`. */
export const icScorerBootstrapInputSchema = z.object({
  dealId: z.string().min(1),
  memberId: z.string().optional(),
  expiresAt: z.coerce.number().int().positive().optional(),
  authSig: z.string().optional(),
  authId: z.string().optional(),
  appSid: z.string().optional(),
  domain: z.string().optional(),
});

/**
 * GET server function: Bitrix CRM fields + indexed document list for the IC scorer widget.
 * Scoring runs via workflows + Postgres chunks (no attachment extraction here).
 */
export const loadIcScorerBootstrapData = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => icScorerBootstrapInputSchema.parse(raw))
  .handler(async ({ data }) => {
    const { runIcScorerBootstrapPayload } = await import(
      "@/lib/server/load-ic-scorer-bootstrap.run"
    );
    return runIcScorerBootstrapPayload(data as IcScorerBootstrapInput);
  });
