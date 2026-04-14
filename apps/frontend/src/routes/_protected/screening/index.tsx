import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  ROUTE_DATA_GC_TIME_MS,
  ROUTE_DATA_STALE_TIME_MS,
} from "@/lib/route-loader-cache";
import CimScreeningIndexSkeleton from "@/components/skeletons/cim-screening-index-skeleton";
import { loadCimScreeningIndexData } from "@/lib/server/cim-screening-route-data";

export const Route = createFileRoute("/_protected/screening/")({
  staleTime: ROUTE_DATA_STALE_TIME_MS,
  gcTime: ROUTE_DATA_GC_TIME_MS,
  head: () => ({
    meta: [{ title: "Screening — Dark Alpha Capital" }],
  }),
  loader: async () => loadCimScreeningIndexData(),
  pendingComponent: CimScreeningIndexSkeleton,
  component: CimScreeningPage,
});

function CimScreeningPage() {
  const { recentSessions } = Route.useLoaderData();

  return (
    <section className="block-space-mini container max-w-6xl">
      <div className="mb-8 flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold md:text-4xl">Screening</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Review recent screening sessions and start a new run from deal
            opportunities, existing documents, or a new upload.
          </p>
        </div>
        <Button asChild>
          <Link to="/screening/new-run">
            <Plus className="mr-2 size-4" />
            New run
          </Link>
        </Button>
      </div>

      <div className="rounded-lg border">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-base font-semibold">Recent sessions</h2>
          <Badge variant="secondary">{recentSessions.length}</Badge>
        </div>

        {recentSessions.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-muted-foreground text-sm">No sessions yet.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File</TableHead>
                <TableHead>Latest template</TableHead>
                <TableHead>Runs</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Open</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentSessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell className="max-w-[240px] truncate text-sm font-medium">
                    {session.fileName}
                  </TableCell>
                  <TableCell className="text-sm">
                    {session.latestScreenerName ?? "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{session.runCount}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {session.latestRunStatus ?? "-"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link
                        to="/screening/$sessionId"
                        params={{ sessionId: session.id }}
                        search={{ runId: undefined }}
                      >
                        View
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </section>
  );
}
