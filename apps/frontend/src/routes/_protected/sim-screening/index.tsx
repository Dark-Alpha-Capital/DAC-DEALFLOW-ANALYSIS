import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Loader2 } from "lucide-react";
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
import useCurrentUser from "@/hooks/use-current-user";
import { QUEUE_NAMES } from "@repo/redis-queue/types";

const readFileAsDataURL = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsDataURL(file);
  });

export const Route = createFileRoute("/_protected/sim-screening/")({
  head: () => ({
    meta: [{ title: "SIM screening — Dark Alpha Capital" }],
  }),
  component: SimScreeningPage,
});

function SimScreeningPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const trpc = useTRPC();
  const user = useCurrentUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [screenerId, setScreenerId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);

  const { data: screeners = [] } = useQuery(trpc.screeners.getAll.queryOptions());

  const { data: recentSessions = [] } = useQuery(
    trpc.simScreening.listSessions.queryOptions({ limit: 20 }),
  );

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
        void navigate({
          to: "/sim-screening/$sessionId",
          params: { sessionId: data.sessionId },
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
    <section className="block-space-mini container max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold md:text-4xl">SIM screening</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Upload a SIM (PDF), pick a screener template, and run AI screening
          against embedded document text. Results are saved per session.
        </p>
      </div>

      <div className="space-y-8">
        <div className="rounded-lg border p-6">
          <h2 className="mb-4 text-lg font-semibold">New run</h2>
          <div className="flex flex-col gap-4 sm:max-w-md">
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
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Choose file
                </Button>
                <span className="text-muted-foreground text-sm">
                  {file ? file.name : "No file selected"}
                </span>
              </div>
            </div>
            <Button
              disabled={startMutation.isPending || !screenerId || !file}
              onClick={() => void handleStart()}
            >
              {startMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Starting…
                </>
              ) : (
                "Start screening"
              )}
            </Button>
          </div>
        </div>

        <div className="rounded-lg border p-6">
          <h2 className="mb-4 text-lg font-semibold">Recent sessions</h2>
          {recentSessions.length === 0 ? (
            <p className="text-muted-foreground text-sm">No sessions yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>Screener</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Open</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSessions.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="max-w-[200px] truncate text-sm">
                      {s.fileName}
                    </TableCell>
                    <TableCell className="text-sm">{s.screenerName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{s.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link
                          to="/sim-screening/$sessionId"
                          params={{ sessionId: s.id }}
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
      </div>
    </section>
  );
}
