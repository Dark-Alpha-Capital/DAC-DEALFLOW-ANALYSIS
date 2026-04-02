import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
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
import { Link } from "@tanstack/react-router";

const readFileAsDataURL = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () =>
      reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsDataURL(file);
  });

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [screenerId, setScreenerId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [isNewRunDialogOpen, setIsNewRunDialogOpen] = useState(false);

  const startMutation = useMutation(
    trpc.simScreening.start.mutationOptions({
      onSuccess: (data) => {
        window.dispatchEvent(
          new CustomEvent("newJobs", {
            detail: [
              {
                jobId: data.jobId,
                fileName: file?.name ?? "SIM.pdf",
                userId: user?.id ?? "",
                queueName: QUEUE_NAMES.SIM_SCREENING,
              },
            ],
          }),
        );
        void queryClient.invalidateQueries({
          queryKey: trpc.simScreening.listSessions.queryKey({ limit: 20 }),
        });
        toast.success("SIM screening started");
        setFile(null);
        setScreenerId("");
        setIsNewRunDialogOpen(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
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

  const handleStart = async () => {
    if (!screenerId) {
      toast.error("Select a screener template");
      return;
    }
    if (!file) {
      toast.error("Choose a PDF");
      return;
    }
    try {
      const fileData = await readFileAsDataURL(file);
      startMutation.mutate({
        fileName: file.name,
        fileData,
        screenerId,
      });
    } catch {
      toast.error("Could not read file");
    }
  };

  return (
    <section className="block-space-mini container max-w-6xl">
      <div className="mb-8 flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold md:text-4xl">CIM screening</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Screen uploaded CIM PDFs against your template library and keep each
            run in one session timeline.
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
                Choose a screener template and upload a PDF.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
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

              <div className="space-y-2">
                <Label>SIM (PDF)</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    if (!f.name.toLowerCase().endsWith(".pdf")) {
                      toast.error("PDF only");
                      return;
                    }
                    if (f.size > 50 * 1024 * 1024) {
                      toast.error("Max 50MB");
                      return;
                    }
                    setFile(f);
                  }}
                />
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Choose file
                  </Button>
                  <p className="text-muted-foreground truncate text-sm">
                    {file ? file.name : "No file selected"}
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                disabled={startMutation.isPending || !screenerId || !file}
                onClick={() => void handleStart()}
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
