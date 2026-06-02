import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { loadScreenersPageData } from "@/lib/server/screeners-route-data";
import { Badge } from "@/components/ui/badge";
import AddScreenerDialog from "@/components/Dialogs/create-screener-dialog";
import DeleteScreenerButton from "@/components/screeners/delete-screener-button";
import ScreenersListPageSkeleton from "@/components/skeletons/screeners-list-page-skeleton";
import {
  ROUTE_DATA_GC_TIME_MS,
  ROUTE_DATA_STALE_TIME_MS,
} from "@/lib/route-loader-cache";

export const Route = createFileRoute("/_protected/screeners/")({
  staleTime: ROUTE_DATA_STALE_TIME_MS,
  gcTime: ROUTE_DATA_GC_TIME_MS,
  head: () => ({
    meta: [{ title: "Screeners — Dark Alpha Capital" }],
  }),
  loader: async () => loadScreenersPageData(),
  pendingComponent: ScreenersListPageSkeleton,
  component: ScreenersRoute,
});

function ScreenersRoute() {
  const { screeners, totalQuestions, totalWeight } = Route.useLoaderData();
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<
    "all" | "Deal Screener" | "Project Screener"
  >("all");

  const filtered = screeners.filter((s) => {
    const matchesName = s.name.toLowerCase().includes(query.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || s.category === categoryFilter;
    return matchesName && matchesCategory;
  });

  return (
    <section className="block-space-mini container">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold md:text-4xl">Screeners</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage structured screener templates and weighted questions.
          </p>
        </div>
        <AddScreenerDialog />
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatBlock label="Templates" value={screeners.length} />
          <StatBlock label="Questions" value={totalQuestions} />
          <StatBlock label="Total Weight" value={totalWeight} />
        </div>

        {/* Filter bar */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            placeholder="Search by name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="sm:max-w-xs"
          />
          <Select
            value={categoryFilter}
            onValueChange={(v) =>
              setCategoryFilter(v as typeof categoryFilter)
            }
          >
            <SelectTrigger className="sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              <SelectItem value="Deal Screener">Deal Screener</SelectItem>
              <SelectItem value="Project Screener">Project Screener</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {screeners.length === 0 ? (
          <div className="rounded-lg border border-dashed p-10 text-center">
            <h2 className="text-lg font-semibold">No screeners yet</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Create a template to start defining structured screening
              questions.
            </p>
            <div className="mt-6 flex justify-center">
              <AddScreenerDialog />
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed p-10 text-center">
            <p className="text-muted-foreground text-sm">
              No screeners match your filters.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <div className="text-muted-foreground bg-muted/40 hidden grid-cols-[minmax(0,2fr)_1fr_120px_120px_140px_auto] gap-4 border-b px-6 py-3 text-xs font-medium tracking-wide uppercase lg:grid">
              <span>Template</span>
              <span>Category</span>
              <span>Questions</span>
              <span>Weight</span>
              <span>Updated</span>
              <span className="text-right">Actions</span>
            </div>

            <div className="divide-y">
              {filtered.map((screener) => (
                <div
                  key={screener.id}
                  className="flex flex-col gap-4 px-5 py-5 lg:grid lg:grid-cols-[minmax(0,2fr)_1fr_120px_120px_140px_auto] lg:items-center lg:gap-4 lg:px-6"
                >
                  <div className="min-w-0">
                    <Link
                      to="/screeners/$uid"
                      params={{ uid: screener.id }}
                      className="hover:text-primary truncate text-base font-semibold transition-colors"
                    >
                      {screener.name}
                    </Link>
                    <p className="text-muted-foreground mt-1 text-sm">
                      {screener.description || "No description provided."}
                    </p>
                  </div>

                  <div className="flex flex-col items-start gap-1 lg:block">
                    <div className="flex items-center justify-between gap-3 lg:block">
                      <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase lg:hidden">
                        Category
                      </span>
                      <Badge variant="secondary">{screener.category}</Badge>
                    </div>
                    {screener.department && (
                      <Badge variant="outline" className="mt-1 text-xs">
                        {screener.department}
                      </Badge>
                    )}
                  </div>

                  <InlineMeta
                    label="Questions"
                    value={String(screener.questionCount ?? 0)}
                  />
                  <InlineMeta
                    label="Weight"
                    value={String(screener.totalWeight ?? 0)}
                  />
                  <InlineMeta
                    label="Updated"
                    value={new Date(screener.updatedAt).toLocaleDateString()}
                  />

                  <div className="flex items-center justify-between gap-3 lg:justify-end">
                    <Button asChild variant="outline" size="sm">
                      <Link to="/screeners/$uid" params={{ uid: screener.id }}>Manage</Link>
                    </Button>
                    <DeleteScreenerButton screenerId={screener.id} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function StatBlock({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border px-4 py-4">
      <div className="text-muted-foreground text-sm">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function InlineMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 lg:block">
      <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase lg:hidden">
        {label}
      </span>
      <span className="text-sm">{value}</span>
    </div>
  );
}

