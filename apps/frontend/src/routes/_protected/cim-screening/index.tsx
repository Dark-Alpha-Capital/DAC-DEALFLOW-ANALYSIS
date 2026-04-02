import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import useCurrentUser from "@/hooks/use-current-user";
import { QUEUE_NAMES } from "@repo/redis-queue/types";
import { loadCimScreeningIndexData } from "@/lib/server/cim-screening-route-data";

export const Route = createFileRoute("/_protected/cim-screening/")({
  head: () => ({
    meta: [{ title: "SIM screening — Dark Alpha Capital" }],
  }),
  loader: async () => loadCimScreeningIndexData(),
  pendingComponent: CimScreeningIndexPending,
  component: SimScreeningPage,
});

function SimScreeningPage() {
  const navigate = Route.useNavigate();
  const { screeners, recentSessions } = Route.useLoaderData();
  const queryClient = useQueryClient();
  const trpc = useTRPC();
  const user = useCurrentUser();
  const [screenerId, setScreenerId] = useState<string>("");
  const [documentId, setDocumentId] = useState<string>("");
  const [isNewRunDialogOpen, setIsNewRunDialogOpen] = useState(false);

  const { data: libraryDocs = [], isLoading: libraryLoading } = useQuery(
    trpc.simScreening.listLibraryDocuments.queryOptions(),
  );

  const startMutation = useMutation(
    trpc.simScreening.start.mutationOptions({
      onSuccess: (data) => {
        window.dispatchEvent(
          new CustomEvent("newJobs", {
            detail: [
              {
                jobId: data.jobId,
                fileName: data.jobLabel,
                userId: user?.id ?? "",
                queueName: QUEUE_NAMES.SIM_SCREENING,
              },
            ],
          }),
        );
        void queryClient.invalidateQueries({
          queryKey: trpc.simScreening.listSessions.queryKey({ limit: 20 }),
        });
        void queryClient.invalidateQueries({
          queryKey: trpc.simScreening.listLibraryDocuments.queryKey(),
        });
        toast.success("CIM screening started");
        setDocumentId("");
        setScreenerId("");
        setIsNewRunDialogOpen(false);
        void navigate({
          to: "/cim-screening/$sessionId",
          params: { sessionId: data.sessionId },
          search: { runId: data.runId },
        });
      },
      onError: (e) => {
        toast.error(e.message ?? "Failed to start screening");
      },
    }),
  );

  const selectedDoc = libraryDocs.find((d) => d.id === documentId);
  const canStart =
    Boolean(screenerId) &&
    Boolean(documentId) &&
    selectedDoc?.ingestionStatus === "PROCESSED";

  const handleStart = () => {
    if (!screenerId || !documentId) return;
    startMutation.mutate({ documentId, screenerId });
  };

  return (
    <section className="block-space-mini container max-w-6xl">
      <div className="mb-8 flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold md:text-4xl">CIM screening</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Screen ingested CIM PDFs from your firm library against templates.
            Upload CIMs under{" "}
            <Link
              to="/documents"
              className="text-foreground font-medium underline underline-offset-4"
            >
              Firm documents
            </Link>{" "}
            (category &quot;CIM&quot;), wait for processing, then start a run
            here—reusing the same document never re-embeds it.
          </p>
        </div>

        <Dialog open={isNewRunDialogOpen} onOpenChange={setIsNewRunDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 size-4" />
              New run
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Start a new CIM screening run</DialogTitle>
              <DialogDescription>
                Pick an ingested document from your library and a screener
                template.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>CIM document</Label>
                {libraryLoading ? (
                  <div className="text-muted-foreground flex items-center gap-2 text-sm">
                    <Loader2 className="size-4 animate-spin" />
                    Loading library…
                  </div>
                ) : libraryDocs.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No CIM uploads yet.{" "}
                    <Link
                      to="/documents"
                      className="text-foreground font-medium underline underline-offset-4"
                    >
                      Upload a PDF
                    </Link>{" "}
                    as firm document category CIM and wait until status is
                    processed.
                  </p>
                ) : (
                  <Select value={documentId} onValueChange={setDocumentId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select document" />
                    </SelectTrigger>
                    <SelectContent>
                      {libraryDocs.map((d) => {
                        const ready = d.ingestionStatus === "PROCESSED";
                        const label = `${d.title || d.fileName} · ${d.ingestionStatus}`;
                        return (
                          <SelectItem
                            key={d.id}
                            value={d.id}
                            disabled={!ready}
                            textValue={label}
                          >
                            <span className="truncate">{d.title}</span>
                            <span className="text-muted-foreground ml-2 text-xs">
                              ({d.ingestionStatus})
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                <Label>Screener template</Label>
                <Select value={screenerId} onValueChange={setScreenerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent>
                    {screeners.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} ({s.category})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                disabled={
                  startMutation.isPending ||
                  !canStart ||
                  libraryLoading ||
                  libraryDocs.length === 0
                }
                onClick={() => handleStart()}
              >
                {startMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Starting...
                  </>
                ) : (
                  "Start screening"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
                        to="/cim-screening/$sessionId"
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

function CimScreeningIndexPending() {
  return (
    <section className="block-space-mini container max-w-6xl space-y-4">
      <div className="bg-muted/40 h-24 animate-pulse rounded-lg border" />
      <div className="bg-muted/30 h-[420px] animate-pulse rounded-lg border" />
    </section>
  );
}
