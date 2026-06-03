import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ArrowUpDown, Loader2 } from "lucide-react";
import { DEPARTMENT_VALUES } from "@repo/db/enums";
import {
  asString,
  looseValidateSearch,
  type LooseSearch,
} from "@/lib/route-search";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "@/lib/navigation-shim";

export const Route = createFileRoute("/_protected/project-trackers/")({
  validateSearch: (search: Record<string, unknown>): LooseSearch =>
    looseValidateSearch(search),
  head: () => ({
    meta: [{ title: "Project Trackers — Dark Alpha Capital" }],
  }),
  component: ProjectTrackersPage,
});

type SortBy = "createdAt" | "department" | "createdBy";
type SortDir = "asc" | "desc";

function scoreColor(score: number | null) {
  if (score === null) return "";
  if (score >= 3.5) return "text-green-600";
  if (score >= 2) return "text-amber-500";
  return "text-red-500";
}

function statusBadgeVariant(status: string | null) {
  if (status === "completed") return "bg-green-100 text-green-800";
  if (status === "running") return "bg-blue-100 text-blue-800";
  if (status === "failed") return "bg-red-100 text-red-800";
  return "bg-muted text-muted-foreground";
}

function ProjectTrackersPage() {
  const trpc = useTRPC();
  const { data: trackers, isLoading } = useQuery(
    trpc.projectTrackers.getAll.queryOptions(),
  );

  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  const sortBy = (asString(searchParams.get("sortBy") ?? undefined) ?? "createdAt") as SortBy;
  const sortDir = (asString(searchParams.get("sortDir") ?? undefined) ?? "desc") as SortDir;
  const departmentFilter = asString(searchParams.get("department") ?? undefined) ?? "";

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    replace(`${pathname}?${params.toString()}`);
  }

  function toggleSortDir() {
    setParam("sortDir", sortDir === "desc" ? "asc" : "desc");
  }

  const sorted = [...(trackers ?? [])].sort((a, b) => {
    let aVal = "";
    let bVal = "";

    if (sortBy === "createdAt") {
      aVal = new Date(a.createdAt).toISOString();
      bVal = new Date(b.createdAt).toISOString();
    } else if (sortBy === "department") {
      aVal = a.department ?? "";
      bVal = b.department ?? "";
    } else if (sortBy === "createdBy") {
      aVal = a.createdBy ?? "";
      bVal = b.createdBy ?? "";
    }

    const cmp = aVal.localeCompare(bVal);
    return sortDir === "asc" ? cmp : -cmp;
  });

  const filtered = departmentFilter
    ? sorted.filter((t) => t.department === departmentFilter)
    : sorted;

  return (
    <section className="block-space-mini container">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold md:text-4xl">Project Trackers</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            All projects across the firm, with AI screening scores and analysis.
          </p>
        </div>
      </div>

      {/* Sort / filter bar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select
          value={sortBy}
          onValueChange={(v) => setParam("sortBy", v)}
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
          onValueChange={(v) => setParam("department", v === "all" ? null : v)}
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

      {isLoading ? (
        <div className="flex items-center gap-2 py-12 text-sm">
          <Loader2 className="text-primary size-4 animate-spin" />
          <span>Loading projects…</span>
        </div>
      ) : !trackers || trackers.length === 0 ? (
        <div className="text-muted-foreground py-12 text-center text-sm">
          No projects yet. Complete a Project Kickoff to see it here.
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-muted-foreground py-12 text-center text-sm">
          No projects match the selected department.
        </div>
      ) : (
        <div className="ring-border/60 overflow-hidden rounded-xl ring-1">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-border/50 border-b">
              <tr>
                <th className="text-muted-foreground px-4 py-3 text-left font-medium">
                  Project name
                </th>
                <th className="text-muted-foreground px-4 py-3 text-left font-medium">
                  Type
                </th>
                <th className="text-muted-foreground px-4 py-3 text-left font-medium">
                  Department
                </th>
                <th className="text-muted-foreground px-4 py-3 text-left font-medium">
                  Status
                </th>
                <th className="text-muted-foreground px-4 py-3 text-left font-medium">
                  Score
                </th>
                <th className="text-muted-foreground px-4 py-3 text-left font-medium">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="divide-border/40 divide-y">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium">
                    <Link
                      to="/project-trackers/$trackerId"
                      params={{ trackerId: t.id }}
                      className="text-primary hover:underline"
                    >
                      {t.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {t.sourceType ? (
                      <Badge variant="outline" className="text-xs">
                        {t.sourceType === "project-kickoff"
                          ? "Project Kickoff"
                          : t.sourceType}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {t.department ?? (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                        statusBadgeVariant(t.screeningStatus),
                      )}
                    >
                      {t.screeningStatus ?? "pending"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {t.screeningScore !== null ? (
                      <span
                        className={cn(
                          "font-semibold tabular-nums",
                          scoreColor(t.screeningScore),
                        )}
                      >
                        {t.screeningScore.toFixed(1)}
                        <span className="text-muted-foreground font-normal">
                          {" "}
                          / 5
                        </span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="text-muted-foreground px-4 py-3">
                    {new Date(t.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
