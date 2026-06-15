import { createServerFn } from "@tanstack/react-start";
import { getAllProjectTrackers } from "@repo/db-tracker/queries";
import { DEPARTMENT_VALUES } from "@repo/enums";
import { assertAuthenticated } from "@/lib/server/assert-session";
import { projectTrackersPageInputSchema } from "@/lib/server/server-fn-input-schemas";
import type {
  ProjectTrackerSortBy,
  ProjectTrackerSortDir,
} from "@/lib/route-search";

function sortProjectTrackers<
  T extends {
    createdAt: Date;
    department: string | null;
    createdBy: string | null;
  },
>(trackers: T[], sortBy: ProjectTrackerSortBy, sortDir: ProjectTrackerSortDir) {
  return [...trackers].sort((a, b) => {
    let aVal = "";
    let bVal = "";

    if (sortBy === "createdAt") {
      aVal = new Date(a.createdAt).toISOString();
      bVal = new Date(b.createdAt).toISOString();
    } else if (sortBy === "department") {
      aVal = a.department ?? "";
      bVal = b.department ?? "";
    } else {
      aVal = a.createdBy ?? "";
      bVal = b.createdBy ?? "";
    }

    const cmp = aVal.localeCompare(bVal);
    return sortDir === "asc" ? cmp : -cmp;
  });
}

export const loadProjectTrackersPageData = createServerFn({ method: "GET" })
  .validator((raw: unknown) => projectTrackersPageInputSchema.parse(raw))
  .handler(async ({ data }) => {
    await assertAuthenticated();
    const all = await getAllProjectTrackers();
    const department =
      data.department &&
      (DEPARTMENT_VALUES as readonly string[]).includes(data.department)
        ? data.department
        : "";

    const filtered = department
      ? all.filter((t) => t.department === department)
      : all;

    const trackers = sortProjectTrackers(
      filtered,
      data.sortBy,
      data.sortDir,
    );

    return {
      trackers,
      totalCount: all.length,
      filteredCount: trackers.length,
    };
  });
