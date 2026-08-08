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

export type ProjectTrackerSortBy = "createdAt" | "department" | "createdBy";
export type ProjectTrackerSortDir = "asc" | "desc";

/** Default URL search for `/_project-trackers/project-trackers/`. */
export const PROJECT_TRACKERS_INDEX_DEFAULT_SEARCH = {
  sortBy: "createdAt",
  sortDir: "desc",
  department: "",
} as const;

const PROJECT_TRACKER_SORT_BY = new Set<ProjectTrackerSortBy>([
  "createdAt",
  "department",
  "createdBy",
]);

/** Project trackers index: sort + department filter (passed to route loader). */
export function projectTrackersListLoaderDeps(search: Record<string, unknown>) {
  const s = search as LooseSearch;
  const sortByRaw = asString(s.sortBy) ?? PROJECT_TRACKERS_INDEX_DEFAULT_SEARCH.sortBy;
  const sortBy: ProjectTrackerSortBy = PROJECT_TRACKER_SORT_BY.has(
    sortByRaw as ProjectTrackerSortBy,
  )
    ? (sortByRaw as ProjectTrackerSortBy)
    : PROJECT_TRACKERS_INDEX_DEFAULT_SEARCH.sortBy;
  const sortDirRaw = asString(s.sortDir) ?? PROJECT_TRACKERS_INDEX_DEFAULT_SEARCH.sortDir;
  const sortDir: ProjectTrackerSortDir =
    sortDirRaw === "asc" ? "asc" : PROJECT_TRACKERS_INDEX_DEFAULT_SEARCH.sortDir;
  const department = (asString(s.department) ?? "").trim();
  return { sortBy, sortDir, department };
}

/** Default URL search for `/_app/screeners/` (department filter). */
export const SCREENERS_INDEX_DEFAULT_SEARCH = {
  department: "",
} as const;

/** Screeners index: department filter (passed to route loader). */
export function screenersListLoaderDeps(search: Record<string, unknown>) {
  const s = search as LooseSearch;
  const department = (asString(s.department) ?? SCREENERS_INDEX_DEFAULT_SEARCH.department).trim();
  return { department };
}
