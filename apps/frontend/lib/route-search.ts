/** URL search as used by migrated list/filter pages (replaces Next.js `searchParams`). */
export type LooseSearch = Record<string, string | string[] | undefined>;

export function looseValidateSearch(
  search: Record<string, unknown>,
): LooseSearch {
  return search as LooseSearch;
}

export function asString(value: string | string[] | undefined) {
  return typeof value === "string" ? value : value?.[0];
}

export function asStringArray(value: string | string[] | undefined) {
  return typeof value === "string" ? [value] : (value ?? []);
}

export function asNumber(value: string | string[] | undefined, fallback: number) {
  const parsed = Number(asString(value));
  return Number.isFinite(parsed) ? parsed : fallback;
}
