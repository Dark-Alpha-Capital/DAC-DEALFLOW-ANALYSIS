const STORAGE_KEY = "dac.bitrixScreenWidget.v1";

export type BitrixWidgetSessionCacheV1 = {
  v: 1;
  dealId: string;
  memberId?: string;
  expiresAt?: number;
  authSig?: string;
  authId?: string;
  appSid?: string;
  domain?: string;
};

export function readBitrixWidgetSessionCache(): BitrixWidgetSessionCacheV1 | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw?.trim()) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      (parsed as { v?: unknown }).v !== 1
    ) {
      return null;
    }
    const dealId = String((parsed as { dealId?: unknown }).dealId ?? "").trim();
    if (!dealId) return null;
    const p = parsed as Record<string, unknown>;
    return {
      v: 1,
      dealId,
      memberId:
        typeof p.memberId === "string" && p.memberId.trim()
          ? p.memberId.trim()
          : undefined,
      expiresAt:
        typeof p.expiresAt === "number" && Number.isFinite(p.expiresAt)
          ? p.expiresAt
          : undefined,
      authSig:
        typeof p.authSig === "string" && p.authSig.trim()
          ? p.authSig.trim()
          : undefined,
      authId:
        typeof p.authId === "string" && p.authId.trim()
          ? p.authId.trim()
          : undefined,
      appSid:
        typeof p.appSid === "string" && p.appSid.trim()
          ? p.appSid.trim()
          : undefined,
      domain:
        typeof p.domain === "string" && p.domain.trim()
          ? p.domain.trim()
          : undefined,
    };
  } catch {
    return null;
  }
}

export function writeBitrixWidgetSessionCache(
  payload: Omit<BitrixWidgetSessionCacheV1, "v">,
): void {
  if (typeof window === "undefined") return;
  const dealId = payload.dealId.trim();
  if (!dealId) return;
  try {
    const toStore: BitrixWidgetSessionCacheV1 = {
      v: 1,
      memberId: payload.memberId?.trim() || undefined,
      expiresAt: payload.expiresAt,
      authSig: payload.authSig?.trim() || undefined,
      authId: payload.authId?.trim() || undefined,
      appSid: payload.appSid?.trim() || undefined,
      domain: payload.domain?.trim() || undefined,
      dealId,
    };
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
  } catch {
    // ignore quota / private mode
  }
}

export type BitrixWidgetSearchFields = {
  dealId?: string;
  memberId?: string;
  expiresAt?: number;
  authSig?: string;
  authId?: string;
  appSid?: string;
  domain?: string;
};

/** URL search wins; session fills gaps after reload. */
export function mergeBitrixWidgetSearchWithSession(
  search: BitrixWidgetSearchFields,
  session: BitrixWidgetSessionCacheV1 | null,
): BitrixWidgetSearchFields {
  return {
    dealId: search.dealId ?? session?.dealId,
    memberId: search.memberId ?? session?.memberId,
    expiresAt: search.expiresAt ?? session?.expiresAt,
    authSig: search.authSig ?? session?.authSig,
    authId: search.authId ?? session?.authId,
    appSid: search.appSid ?? session?.appSid,
    domain: search.domain ?? session?.domain,
  };
}
