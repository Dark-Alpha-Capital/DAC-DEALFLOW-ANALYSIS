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

export function asNumber(
  value: string | string[] | number | undefined,
  fallback: number,
) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(asString(value as string | string[] | undefined));
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Normalized deps for TanStack Router `loaderDeps` on paginated list routes. */
export function paginatedListLoaderDeps(search: Record<string, unknown>) {
  const s = search as LooseSearch;
  return {
    page: Math.max(1, asNumber(s.page, 1)),
    limit: Math.max(1, asNumber(s.limit, 25)),
  };
}

/** Default URL search for `/_protected/deal-opportunities/` (pagination + query). */
export const DEAL_OPPORTUNITIES_INDEX_DEFAULT_SEARCH = {
  page: 1,
  limit: 25,
  q: "",
} as const;

/** Deal opportunities index: page, page size, and server-side search query. */
export function dealOpportunitiesListLoaderDeps(search: Record<string, unknown>) {
  const s = search as LooseSearch;
  return {
    page: Math.max(1, asNumber(s.page, 1)),
    limit: Math.max(1, Math.min(100, asNumber(s.limit, 25))),
    q: (asString(s.q) ?? "").trim().slice(0, 500),
  };
}

/** Normalized deps for investment themes index loader (must match loader filters). */
export function investmentThemesListLoaderDeps(search: Record<string, unknown>) {
  const searchParams = search as LooseSearch;
  const currentPage = Math.max(1, asNumber(searchParams.page, 1));
  const limit = Math.max(1, asNumber(searchParams.limit, 25));
  const query = asString(searchParams.query) ?? "";
  const sector = asString(searchParams.sector) ?? "";
  const statusRaw = asString(searchParams.status) ?? "";
  const minCapitalPriority = asNumber(searchParams.minCapitalPriority, NaN);
  const maxCapitalPriority = asNumber(searchParams.maxCapitalPriority, NaN);
  const minConfidence = asNumber(searchParams.minConfidence, NaN);
  const maxConfidence = asNumber(searchParams.maxConfidence, NaN);
  const status =
    statusRaw && ["ACTIVE", "PAUSED", "RETIRED"].includes(statusRaw)
      ? statusRaw
      : undefined;

  return {
    page: currentPage,
    limit,
    query,
    sector,
    status,
    minCapitalPriority: Number.isFinite(minCapitalPriority)
      ? minCapitalPriority
      : null,
    maxCapitalPriority: Number.isFinite(maxCapitalPriority)
      ? maxCapitalPriority
      : null,
    minConfidence: Number.isFinite(minConfidence) ? minConfidence : null,
    maxConfidence: Number.isFinite(maxConfidence) ? maxConfidence : null,
  };
}
