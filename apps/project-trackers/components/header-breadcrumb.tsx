import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { usePathname, useSearchParams } from "@/lib/navigation-shim";
import { useTRPC } from "@/trpc/client";
import { PROJECT_TRACKERS_INDEX_DEFAULT_SEARCH } from "@/lib/route-search";

const TAB_LABELS: Record<string, string> = {
  "work-items": "Work Items",
  epics: "Epics",
  cycles: "Cycles",
  modules: "Modules",
  "ai-scoring": "AI Scoring",
  "project-info": "Core Info",
};

function Sep() {
  return <ChevronRight className="text-muted-foreground/50 size-3.5 shrink-0" />;
}

export function HeaderBreadcrumb() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const trpc = useTRPC();

  const trackerMatch = pathname.match(/^\/project-trackers\/([^/?]+)/);
  const trackerId = trackerMatch?.[1] ?? null;

  const { data } = useQuery({
    ...trpc.projectTrackers.getById.queryOptions({ trackerId: trackerId ?? "" }),
    enabled: !!trackerId,
  });

  if (!trackerId) {
    const label = pathname.startsWith("/screeners")
      ? "Screeners"
      : pathname.startsWith("/initiatives")
        ? "Initiatives"
        : pathname.startsWith("/analytics")
          ? "Analytics"
          : pathname.startsWith("/project-kickoff")
            ? "New Kickoff"
            : "Project Trackers";
    return (
      <span className="text-foreground text-sm font-medium">{label}</span>
    );
  }

  const projectName = data?.kickoff?.projectName ?? data?.tracker?.name;
  const tab = searchParams.get("tab") ?? "work-items";

  return (
    <div className="flex min-w-0 items-center gap-1.5 text-sm">
      <Link
        to="/project-trackers"
        search={PROJECT_TRACKERS_INDEX_DEFAULT_SEARCH}
        className="text-muted-foreground hover:text-foreground shrink-0"
      >
        Project Trackers
      </Link>
      <Sep />
      <span className="text-foreground max-w-[220px] truncate font-medium">
        {projectName ?? "Project"}
      </span>
      <Sep />
      <span className="text-muted-foreground shrink-0">
        {TAB_LABELS[tab] ?? ""}
      </span>
    </div>
  );
}
