import { z } from "zod";

export const bitrixWidgetSearchSchema = z.object({
  dealId: z.string().min(1).optional(),
  memberId: z.string().optional(),
  expiresAt: z.coerce.number().int().positive().optional(),
  authSig: z.string().optional(),
  authId: z.string().optional(),
  appSid: z.string().optional(),
  domain: z.string().optional(),
});

export type BitrixWidgetSearch = z.infer<typeof bitrixWidgetSearchSchema>;

const SEARCH_KEYS = [
  "dealId",
  "memberId",
  "expiresAt",
  "authSig",
  "authId",
  "appSid",
  "domain",
] as const;

export function mapBitrixWidgetSearch(
  search: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of SEARCH_KEYS) {
    const upper = k.toUpperCase();
    out[k] =
      typeof search[k] === "string"
        ? search[k]
        : typeof search[upper] === "string"
          ? search[upper]
          : k === "expiresAt"
            ? (search[upper] ?? search[k] ?? undefined)
            : undefined;
  }
  return out;
}

export function hasWidgetBootstrapAuth(
  s: z.infer<typeof bitrixWidgetSearchSchema>,
): boolean {
  return Boolean(
    (s.memberId && s.expiresAt && s.authSig) ||
      (s.authId && s.domain) ||
      (s.appSid && s.domain),
  );
}

export function buildBootstrapInput(
  s: z.infer<typeof bitrixWidgetSearchSchema>,
  dealId: string,
) {
  return {
    dealId,
    memberId: s.memberId,
    expiresAt: s.expiresAt,
    authSig: s.authSig,
    authId: s.authId,
    appSid: s.appSid,
    domain: s.domain,
  };
}

export function reloadPage() {
  window.location.reload();
}
