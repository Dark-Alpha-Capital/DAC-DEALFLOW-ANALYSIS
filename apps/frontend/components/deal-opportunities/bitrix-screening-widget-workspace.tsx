import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, Play, Upload } from "lucide-react";
import { toast } from "sonner";
import type { inferRouterOutputs } from "@trpc/server";
import { useTRPC } from "@/trpc/client";
import type { AppRouter } from "@/trpc/routers/_app";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Props = {
  dealId: string;
  memberId?: string;
  expiresAt?: number;
  authSig?: string;
  authId?: string;
  appSid?: string;
  domain?: string;
};

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () =>
      reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function Panel({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "border-border bg-card rounded-lg border p-4 shadow-sm",
        className,
      )}
    >
      <h2 className="text-foreground mb-3 text-xs font-semibold tracking-wide uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

function screeningStillRunning(status: string | undefined) {
  return (
    status === "PENDING" || status === "INGESTING" || status === "SCREENING"
  );
}

type WidgetBootstrap =
  inferRouterOutputs<AppRouter>["dealOpportunities"]["getBitrixScreeningWidgetContext"];

function startScreeningBlockedReason(args: {
  data: WidgetBootstrap;
  effectiveScreenerId: string;
  indexed: boolean;
  runPending: boolean;
}): string | null {
  const { data, effectiveScreenerId, indexed, runPending } = args;
  if (runPending) return "Starting screening…";
  if (data.activeJobs.length > 0) {
    return "Screening is already running for this deal (workflow job in progress). Wait for it to finish.";
  }
  if (!effectiveScreenerId) {
    return data.screeners.length === 0
      ? "No screeners exist in the app."
      : "Select a screener from the dropdown.";
  }
  if (!indexed) {
    const syncing = data.bitrixAttachmentSync.some(
      (a) =>
        a.syncStatus === "syncing" ||
        a.syncStatus === "pending" ||
        a.ingestionStatus === "PENDING" ||
        a.ingestionStatus === "PROCESSING",
    );
    if (syncing) {
      return "Bitrix files are downloading / ingesting into search. Wait a moment, then this will enable automatically.";
    }
    return "No indexed text yet. We try to pull Bitrix files automatically on load—check status below—or upload a file manually.";
  }
  return null;
}

export function BitrixScreeningWidgetWorkspace(props: Props) {
  const trpc = useTRPC();
  const [screenerId, setScreenerId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const didAutoSync = useRef(false);

  const q = useQuery({
    ...trpc.dealOpportunities.getBitrixScreeningWidgetContext.queryOptions(
      props,
    ),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      if (data.activeJobs.length > 0) return 4_000;
      if (screeningStillRunning(data.lastRun?.status)) return 4_000;
      const ingestBusy = data.bitrixAttachmentSync.some(
        (a) =>
          a.syncStatus === "syncing" ||
          a.syncStatus === "pending" ||
          a.ingestionStatus === "PENDING" ||
          a.ingestionStatus === "PROCESSING",
      );
      if (
        ingestBusy ||
        (data.indexedCount === 0 && data.bitrixFiles.length > 0)
      ) {
        return 4_000;
      }
      return false;
    },
  });

  const syncAttachments = useMutation(
    trpc.dealOpportunities.syncBitrixWidgetAttachments.mutationOptions({
      onSuccess: (res) => {
        if (res.started > 0) {
          toast.success(`Queued ${res.started} Bitrix file(s) for ingestion`);
        }
        void q.refetch();
      },
      onError: (e) => toast.error(e.message || "Could not sync Bitrix files"),
    }),
  );

  const propsRef = useRef(props);
  propsRef.current = props;
  useEffect(() => {
    if (!q.data?.dealOpportunityId || didAutoSync.current) return;
    didAutoSync.current = true;
    syncAttachments.mutate(propsRef.current);
  }, [q.data?.dealOpportunityId, syncAttachments]);

  const upload = useMutation(
    trpc.dealOpportunities.uploadBitrixScreeningWidgetDocument.mutationOptions({
      onSuccess: () => {
        toast.success("Upload queued");
        setFile(null);
        void q.refetch();
      },
      onError: (e) => toast.error(e.message || "Upload failed"),
    }),
  );

  const run = useMutation(
    trpc.dealOpportunities.startBitrixScreeningWidgetRun.mutationOptions({
      onSuccess: () => {
        toast.success("Screening started");
        void q.refetch();
      },
      onError: (e) => toast.error(e.message || "Could not start screening"),
    }),
  );

  const d = q.data;
  const screeners = d?.screeners ?? [];
  const effectiveScreenerId = screenerId || screeners[0]?.id || "";
  const indexed = (d?.indexedCount ?? 0) > 0;
  const runBlocked =
    d == null
      ? null
      : startScreeningBlockedReason({
          data: d,
          effectiveScreenerId,
          indexed,
          runPending: run.isPending,
        });
  const canRun = d != null && runBlocked === null;

  useEffect(() => {
    if (!d) return;
    console.info("[Bitrix screening widget] summary", {
      bitrixDealId: d.bitrixDealId,
      labelSource: d.bitrixFieldLabelSource,
      fieldRows: d.bitrixDealFields.length,
      fileAttachments: d.bitrixFiles.length,
      indexedChunks: d.indexedCount,
      screeners: d.screeners.length,
      activeScreeningJobs: d.activeJobs.length,
    });
    if (import.meta.env.DEV) {
      console.info("[Bitrix screening widget] full TRPC payload (dev)", {
        bitrixDealFields: d.bitrixDealFields,
        bitrixFiles: d.bitrixFiles,
      });
    }
  }, [d]);

  if (q.isLoading) {
    return (
      <div className="text-muted-foreground flex items-center justify-center gap-2 p-12 text-sm">
        <Loader2 className="size-4 animate-spin" />
        Loading…
      </div>
    );
  }

  if (q.error || !d) {
    return (
      <div className="text-destructive mx-auto max-w-lg p-6 text-sm">
        {q.error?.message ??
          "Could not load deal. Check widget auth and retry."}
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-[1400px] gap-4 p-3 md:grid-cols-2 md:gap-6 md:p-4">
      {/* Left: context + config */}
      <div className="flex min-w-0 flex-col gap-4">
        <header>
          <h1 className="text-foreground text-lg font-semibold tracking-tight">
            Deal screening
          </h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Bitrix #{d.bitrixDealId} · App{" "}
            <code className="text-xs">{d.appDeal.id}</code>
            {syncAttachments.isPending ? (
              <span className="ml-2 inline-flex items-center gap-1">
                <Loader2 className="size-3 animate-spin" />
                Syncing Bitrix files…
              </span>
            ) : null}
          </p>
        </header>

        <Panel title="Bitrix files → app (auto-ingest)">
          <p className="text-muted-foreground mb-2 text-xs">
            On load we pull Drive attachments into this workspace and index them
            for screening. Tracked per Bitrix file id (not only the app deal
            id).
          </p>
          {d.bitrixAttachmentSync.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No file fields detected on this Bitrix deal, or deal fetch failed.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {d.bitrixAttachmentSync.map((a) => (
                <li
                  key={a.bitrixDiskFileId}
                  className="border-border/80 rounded border px-2 py-2"
                >
                  <div className="font-medium">
                    {a.displayName ?? a.fieldLabel}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    Sync:{" "}
                    <span className="text-foreground font-medium">
                      {a.syncStatus}
                    </span>
                    {a.chunkCount > 0
                      ? ` · ${a.chunkCount} chunks indexed`
                      : ""}
                    {a.ingestionStatus ? ` · doc ${a.ingestionStatus}` : ""}
                  </div>
                  {a.lastError ? (
                    <p className="text-destructive mt-1 text-xs">
                      {a.lastError}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3 cursor-pointer"
            disabled={syncAttachments.isPending}
            onClick={() => syncAttachments.mutate(props)}
          >
            {syncAttachments.isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : null}
            Retry Bitrix file sync
          </Button>
        </Panel>

        <Panel title="Recent screening runs">
          {d.recentScreeningRuns.length === 0 ? (
            <p className="text-muted-foreground text-sm">No runs yet.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {d.recentScreeningRuns.map((r) => (
                <li
                  key={r.runId}
                  className="border-border/60 flex flex-wrap gap-x-3 gap-y-0.5 rounded border px-2 py-1.5 text-xs"
                >
                  <span className="font-medium">{r.status}</span>
                  {r.screenerName ? (
                    <span className="text-muted-foreground">
                      {r.screenerName}
                    </span>
                  ) : null}
                  <span className="text-muted-foreground">
                    {new Date(r.createdAt).toLocaleString()}
                  </span>
                  {r.errorMessage ? (
                    <span className="text-destructive w-full">
                      {r.errorMessage}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Workspace opportunity">
          <div className="grid gap-2 text-sm">
            <SummaryRow label="Title" value={d.appDeal.title ?? "—"} />
            <SummaryRow label="Stage" value={d.appDeal.stage ?? "—"} />
          </div>
          <Link
            to="/deal-opportunities/$uid"
            params={{ uid: d.appDeal.id }}
            className="text-primary mt-3 inline-block text-sm font-medium underline-offset-4 hover:underline"
          >
            Open in app
          </Link>
        </Panel>

        <Panel title="Bitrix deal — all fields">
          <p className="text-muted-foreground mb-2 text-xs">
            Labels from{" "}
            {d.bitrixFieldLabelSource === "live"
              ? "live Bitrix metadata (crm.deal.fields + userfield.list)."
              : d.bitrixFieldLabelSource === "catalog"
                ? "saved catalog / env JSON (live metadata unavailable)."
                : "API key only (no catalog)."}
            Values are from <code className="text-[11px]">crm.deal.get</code>.
          </p>
          <div className="max-h-[40vh] overflow-auto rounded-md border">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="border-b px-2 py-1.5 font-medium">Label</th>
                  <th className="border-b px-2 py-1.5 font-medium">API key</th>
                  <th className="border-b px-2 py-1.5 font-medium">Type</th>
                  <th className="border-b px-2 py-1.5 font-medium">Value</th>
                </tr>
              </thead>
              <tbody>
                {d.bitrixDealFields.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="text-muted-foreground px-2 py-3 text-center"
                    >
                      No Bitrix payload (webhook or deal fetch failed).
                    </td>
                  </tr>
                ) : (
                  d.bitrixDealFields.map((row) => (
                    <tr key={row.key} className="border-border/60 border-b">
                      <td className="text-foreground px-2 py-1.5 align-top font-medium">
                        {row.label}
                      </td>
                      <td className="text-muted-foreground px-2 py-1.5 align-top font-mono">
                        {row.key}
                      </td>
                      <td className="text-muted-foreground px-2 py-1.5 align-top font-mono">
                        {row.type ?? "—"}
                      </td>
                      <td className="max-w-[min(40vw,240px)] px-2 py-1.5 wrap-break-word whitespace-pre-wrap">
                        {row.value}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="File / disk fields (detected)">
          <p className="text-muted-foreground mb-2 text-xs">
            File titles are loaded with{" "}
            <code className="text-[11px]">disk.file.get</code> when the webhook
            has Drive access. If you only see field codes, widen webhook scopes.
          </p>
          {d.bitrixFiles.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No file-typed fields detected on this deal (or values are empty).
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {d.bitrixFiles.map((f, i) => (
                <li
                  key={`${f.field}-${f.primaryId}-${i}`}
                  className="border-border/80 space-y-1 rounded border px-2 py-2"
                >
                  <div className="text-foreground font-medium">
                    {f.displayName ?? f.fieldLabel}
                  </div>
                  {f.displayName ? (
                    <div className="text-muted-foreground text-xs">
                      Bitrix field: {f.fieldLabel}
                    </div>
                  ) : null}
                  <div className="text-muted-foreground font-mono text-[11px]">
                    {f.field}
                    {f.fieldType ? ` · ${f.fieldType}` : ""}
                  </div>
                  <div className="text-xs">
                    <span className="text-muted-foreground">
                      {f.displayName ? "Drive id: " : "Primary id: "}
                    </span>
                    <code className="text-[11px]">{f.primaryId}</code>
                    <span className="text-muted-foreground ml-2">
                      ({f.shape})
                    </span>
                  </div>
                  <p className="text-muted-foreground text-xs">{f.summary}</p>
                  <details className="text-xs">
                    <summary className="cursor-pointer font-medium">
                      Raw JSON (debug)
                    </summary>
                    <pre className="bg-muted/40 mt-1 max-h-32 overflow-auto rounded p-2 font-mono text-[10px] whitespace-pre-wrap">
                      {f.rawJson}
                    </pre>
                  </details>
                </li>
              ))}
            </ul>
          )}
          <p className="text-muted-foreground mt-2 text-xs">
            Indexed chunks for screening: {d.indexedCount}
            {!d.webhookConfigured ? " · Bitrix webhook not configured" : ""}
          </p>
        </Panel>

        <Panel title="Run screening">
          <div className="space-y-3">
            <div>
              <Label htmlFor="scr">Screener</Label>
              <Select value={effectiveScreenerId} onValueChange={setScreenerId}>
                <SelectTrigger id="scr" className="mt-1">
                  <SelectValue placeholder="Choose screener" />
                </SelectTrigger>
                <SelectContent>
                  {screeners.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!indexed ? (
              <div className="space-y-2 rounded-md border border-dashed p-3">
                <Label htmlFor="up">Upload document (ingest)</Label>
                <input
                  id="up"
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="mt-1 block w-full text-sm"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={!file || upload.isPending}
                  className="cursor-pointer"
                  onClick={async () => {
                    if (!file) return;
                    const fileData = await toBase64(file);
                    await upload.mutateAsync({
                      ...props,
                      fileName: file.name,
                      fileType: file.type || "application/octet-stream",
                      fileData,
                      title: file.name,
                      description: "Bitrix widget upload",
                      category: "OTHER",
                    });
                  }}
                >
                  {upload.isPending ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 size-4" />
                  )}
                  Upload
                </Button>
              </div>
            ) : null}

            <div className="space-y-2">
              <Button
                type="button"
                disabled={!canRun}
                className="cursor-pointer"
                onClick={() =>
                  run.mutate({ ...props, screenerId: effectiveScreenerId })
                }
              >
                {run.isPending ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Play className="mr-2 size-4" />
                )}
                Start screening
              </Button>
              <p
                className={
                  canRun
                    ? "text-muted-foreground text-xs"
                    : "text-destructive text-sm"
                }
                role="status"
              >
                {canRun
                  ? "Button is enabled — screening will use indexed chunks."
                  : (runBlocked ?? "")}
              </p>
            </div>
          </div>
        </Panel>
      </div>

      {/* Right: screening output */}
      <div className="flex min-h-0 min-w-0 flex-col gap-4 md:sticky md:top-4 md:self-start">
        <Panel title="Screening result" className="min-h-[200px]">
          {d.activeJobs.length > 0 ? (
            <p className="text-muted-foreground text-sm">
              Workflow running ({d.activeJobs.length} job
              {d.activeJobs.length > 1 ? "s" : ""})…
            </p>
          ) : null}

          {!d.lastRun ? (
            <p className="text-muted-foreground text-sm">
              No screening run yet for this opportunity.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="text-sm">
                <p>
                  <span className="text-muted-foreground">Status:</span>{" "}
                  <span className="font-medium">{d.lastRun.status}</span>
                </p>
                {d.lastRun.screenerName ? (
                  <p>
                    <span className="text-muted-foreground">Screener:</span>{" "}
                    {d.lastRun.screenerName}
                  </p>
                ) : null}
                {d.lastRun.errorMessage ? (
                  <p className="text-destructive mt-2 text-xs whitespace-pre-wrap">
                    {d.lastRun.errorMessage}
                  </p>
                ) : null}
              </div>

              {d.lastRun.answers.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  {screeningStillRunning(d.lastRun.status)
                    ? "Answers appear when screening completes."
                    : "No answers stored for this run."}
                </p>
              ) : (
                <ol className="max-h-[min(70vh,800px)] space-y-3 overflow-y-auto pr-1">
                  {d.lastRun.answers.map((a, i) => (
                    <li
                      key={a.questionId}
                      className="border-border rounded-md border p-3 text-sm"
                    >
                      <p className="text-muted-foreground text-xs font-medium">
                        Q{i + 1}
                      </p>
                      <p className="mt-1 font-medium">{a.question}</p>
                      <p className="text-muted-foreground mt-2 text-xs">
                        Score: {a.score}
                      </p>
                      <p className="mt-2 leading-relaxed whitespace-pre-wrap">
                        {a.rationale}
                      </p>
                      {a.evidenceChunkIds.length > 0 ? (
                        <p className="text-muted-foreground mt-2 font-mono text-[11px]">
                          Evidence: {a.evidenceChunkIds.join(", ")}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[88px_1fr] gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 wrap-break-word">{value}</span>
    </div>
  );
}
