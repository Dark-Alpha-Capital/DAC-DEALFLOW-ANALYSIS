/** Client-only helpers for resolving Bitrix deal id outside query strings. */

export function extractDealIdFromReferrer(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const ref = document.referrer || "";
  if (!ref) return undefined;
  const direct = ref.match(/\/crm\/deal\/details\/(\d+)\//i);
  if (direct?.[1]) return direct[1];
  try {
    const u = new URL(ref);
    const any = u.searchParams.get("any") || "";
    const decoded = decodeURIComponent(any);
    const fromAny = decoded.match(/details\/(\d+)\//i);
    if (fromAny?.[1]) return fromAny[1];
  } catch {
    /* ignore */
  }
  return undefined;
}

export function extractDealIdFromPlacementInfo(info: unknown): string | undefined {
  const rec = info as Record<string, unknown> | null | undefined;
  const opts =
    (rec?.options as Record<string, unknown> | undefined) ??
    (rec?.placementOptions as Record<string, unknown> | undefined);
  const rawId =
    opts?.ID ??
    opts?.id ??
    opts?.ENTITY_ID ??
    opts?.entityId ??
    rec?.ID ??
    rec?.id;
  if (rawId == null) return undefined;
  const s = String(rawId).trim();
  return s || undefined;
}
