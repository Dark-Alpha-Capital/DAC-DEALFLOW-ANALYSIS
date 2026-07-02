import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  scoreColor,
  stageBadgeVariant,
  stageLabel,
  statusBadgeVariant,
} from "@/lib/project-tracker-display";
import { cn } from "@/lib/utils";
import { ArrowUpDown, Plus } from "lucide-react";
import { DEPARTMENT_VALUES } from "@repo/enums";
import { loadProjectTrackersPageData } from "@/lib/server/project-trackers-route-data";
import ProjectTrackersPageSkeleton from "@/components/skeletons/ProjectTrackersPageSkeleton";
import {
  ROUTE_DATA_GC_TIME_MS,
  ROUTE_DATA_STALE_TIME_MS,
} from "@/lib/route-loader-cache";
import {
  looseValidateSearch,
  projectTrackersListLoaderDeps,
} from "@/lib/route-search";

export const Route = createFileRoute("/_app/project-trackers/")({
  validateSearch: (input: Record<string, unknown>) =>
    projectTrackersListLoaderDeps(looseValidateSearch(input)),
  staleTime: ROUTE_DATA_STALE_TIME_MS,
  gcTime: ROUTE_DATA_GC_TIME_MS,
  loaderDeps: ({ search }) => search,
  head: () => ({
    meta: [{ title: "Project Trackers — Dark Alpha Capital" }],
  }),
  loader: async ({ deps }) => loadProjectTrackersPageData({ data: deps }),
  pendingComponent: ProjectTrackersPageSkeleton,
  component: ProjectTrackersPage,
});

function ProjectTrackersPage() {
  const navigate = Route.useNavigate();
  const { sortBy, sortDir, department: departmentFilter } = Route.useSearch();
  const { trackers, totalCount, filteredCount } = Route.useLoaderData();

  function setSearch(
    patch: Partial<{
      sortBy: typeof sortBy;
      sortDir: typeof sortDir;
      department: string;
    }>,
  ) {
    navigate({
      search: (prev) => ({ ...prev, ...patch }),
      replace: true,
    });
  }

  function toggleSortDir() {
    setSearch({ sortDir: sortDir === "desc" ? "asc" : "desc" });
  }

  return (
    <section className="w-full pb-8">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold md:text-4xl">Project Trackers</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            All projects across the firm, with AI screening scores and analysis.
          </p>
        </div>
        <Button asChild size="sm">
          <Link to="/project-kickoff" className="gap-2">
            <Plus className="size-4" />
            New Project Kickoff
          </Link>
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select
          value={sortBy}
          onValueChange={(v) => setSearch({ sortBy: v as typeof sortBy })}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt">Created date</SelectItem>
            <SelectItem value="department">Department</SelectItem>
            <SelectItem value="createdBy">Created by</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          onClick={toggleSortDir}
          className="gap-1.5"
        >
          <ArrowUpDown className="size-4" />
          {sortDir === "desc" ? "Newest first" : "Oldest first"}
        </Button>

        <Select
          value={departmentFilter || "all"}
          onValueChange={(v) => setSearch({ department: v === "all" ? "" : v })}
        >
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            {DEPARTMENT_VALUES.map((dept) => (
              <SelectItem key={dept} value={dept}>
                {dept}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {totalCount === 0 ? (
        <div className="text-muted-foreground flex flex-col items-center gap-3 py-12 text-center text-sm">
          <p>No projects yet. Start a Project Kickoff to see it here.</p>
          <Button asChild size="sm" variant="outline">
            <Link to="/project-kickoff" className="gap-2">
              <Plus className="size-4" />
              New Project Kickoff
            </Link>
          </Button>
        </div>
      ) : filteredCount === 0 ? (
        <div className="text-muted-foreground py-12 text-center text-sm">
          No projects match the selected department.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {trackers.map((t) => (
            <Link
              key={t.id}
              to="/project-trackers/$trackerId"
              params={{ trackerId: t.id }}
              className="group bg-card/40 ring-border/60 hover:ring-primary/40 flex flex-col gap-3 rounded-xl p-4 ring-1 transition-all hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg text-base font-bold">
                    {t.name.charAt(0).toUpperCase() || "P"}
                  </div>
                  <div className="min-w-0">
                    <div className="group-hover:text-primary truncate font-semibold">
                      {t.name}
                    </div>
                    <div className="text-muted-foreground truncate text-xs">
                      {t.department ?? "—"}
                    </div>
                  </div>
                </div>
                {t.screeningScore !== null && (
                  <div
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-full border-[3px] border-current text-xs font-bold tabular-nums",
                      scoreColor(t.screeningScore),
                    )}
                  >
                    {t.screeningScore.toFixed(1)}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                    stageBadgeVariant(t.stage),
                  )}
                >
                  {stageLabel(t.stage)}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                    statusBadgeVariant(t.screeningStatus),
                  )}
                >
                  {t.screeningStatus ?? "pending"}
                </span>
                <span className="text-muted-foreground ml-auto text-xs">
                  {new Date(t.createdAt).toLocaleDateString()}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
