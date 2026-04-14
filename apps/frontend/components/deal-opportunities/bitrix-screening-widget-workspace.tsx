import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import { CheckCircle2, Loader2, Play, Upload, FileText } from "lucide-react";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import type { AppRouter } from "@/trpc/routers/_app";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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

type WidgetContext = inferRouterOutputs<AppRouter>["dealOpportunities"]["getBitrixScreeningWidgetContext"];

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () =>
      reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function Detail({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-0.5", className)}>
      <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
        {label}
      </p>
      <div className="text-foreground text-sm font-medium leading-snug break-words">
        {children}
      </div>
    </div>
  );
}

function DealConnectionPanel({ data }: { data: WidgetContext }) {
  const bitrixTitle =
    data.bitrixDeal?.title?.trim() || `Bitrix deal #${data.bitrixDealId}`;
  const appTitle =
    data.appDeal.title?.trim() || "Linked opportunity (no title yet)";

  return (
    <div className="space-y-4">
      <Alert
        className={cn(
          "border-emerald-500/35 bg-emerald-500/[0.06] text-foreground",
          "dark:border-emerald-400/30 dark:bg-emerald-500/[0.08]",
        )}
      >
        <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
        <AlertTitle className="text-emerald-950 dark:text-emerald-50">
          Deal loaded
        </AlertTitle>
        <AlertDescription className="text-emerald-900/90 dark:text-emerald-100/90">
          This widget is connected to your Bitrix deal and your workspace
          opportunity. You can run screening below.
        </AlertDescription>
      </Alert>

      <Card className="border-border/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Deal information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Detail label="Bitrix — name">{bitrixTitle}</Detail>
          <Detail label="Bitrix — ID">{data.bitrixDealId}</Detail>
          {data.bitrixDeal?.stageId ? (
            <Detail label="Bitrix — stage ID">{data.bitrixDeal.stageId}</Detail>
          ) : null}
          {data.bitrixDeal?.amount ? (
            <Detail label="Bitrix — amount">{data.bitrixDeal.amount}</Detail>
          ) : null}
          <Detail label="App — opportunity">{appTitle}</Detail>
          {data.appDeal.stage ? (
            <Detail label="App — stage">{data.appDeal.stage}</Detail>
          ) : null}
          <Detail label="App — record ID" className="sm:col-span-2">
            <code className="text-xs font-normal">{data.appDeal.id}</code>
          </Detail>
          <div className="sm:col-span-2">
            <Link
              to="/deal-opportunities/$uid"
              params={{ uid: data.appDeal.id }}
              className="text-primary text-sm font-medium underline-offset-4 hover:underline"
            >
              Open full deal in app →
            </Link>
            <span className="text-muted-foreground mt-1 block text-xs">
              Requires signing in if you are not already authenticated.
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function BitrixScreeningWidgetWorkspace(props: Props) {
  const trpc = useTRPC();
  const [selectedScreenerId, setSelectedScreenerId] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const bootstrap = useQuery(
    trpc.dealOpportunities.getBitrixScreeningWidgetContext.queryOptions(props),
  );

  const uploadMutation = useMutation(
    trpc.dealOpportunities.uploadBitrixScreeningWidgetDocument.mutationOptions({
      onSuccess: () => {
        toast.success("File queued for ingestion");
        setSelectedFile(null);
        void bootstrap.refetch();
      },
      onError: (e) => toast.error(e.message || "Upload failed"),
    }),
  );

  const runMutation = useMutation(
    trpc.dealOpportunities.startBitrixScreeningWidgetRun.mutationOptions({
      onSuccess: () => {
        toast.success("Screening started");
        void bootstrap.refetch();
      },
      onError: (e) => toast.error(e.message || "Failed to start screening"),
    }),
  );

  const data = bootstrap.data;
  const screeners = data?.screeners ?? [];
  const screenerId = selectedScreenerId || screeners[0]?.id || "";
  const hasIndexedDocs = (data?.indexedCount ?? 0) > 0;
  const hasBitrixFiles = data?.hasFiles ?? false;
  const canRun = !!screenerId && hasIndexedDocs && !runMutation.isPending;

  const statusLine = useMemo(() => {
    if (hasIndexedDocs) {
      return `${data?.indexedCount ?? 0} indexed chunks ready for screening.`;
    }
    if (hasBitrixFiles) {
      return "Bitrix has files on the deal; upload one document here to ingest it into this app.";
    }
    return "No Bitrix files detected. Upload a document to ingest and screen.";
  }, [data?.indexedCount, hasBitrixFiles, hasIndexedDocs]);

  return (
    <section className="mx-auto w-full max-w-3xl space-y-4 px-3 py-4 sm:px-4">
      <Card className="border-border/70 bg-card/85 backdrop-blur-sm">
        <CardHeader className="space-y-1 pb-2">
          <CardTitle className="text-base sm:text-lg">
            Bitrix deal screening
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            Ingest documents, pick a screener, and start an AI screening run.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {bootstrap.isLoading ? (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Loading deal…
            </div>
          ) : bootstrap.error ? (
            <Alert variant="destructive">
              <AlertTitle>Could not load deal</AlertTitle>
              <AlertDescription>
                {bootstrap.error.message ||
                  "Check widget auth (signed URL, AUTH_ID, or APP_SID) and try again."}
              </AlertDescription>
            </Alert>
          ) : data ? (
            <>
              <DealConnectionPanel data={data} />

              <Alert>
                <AlertDescription>{statusLine}</AlertDescription>
              </Alert>

              {data.bitrixFiles.length > 0 ? (
                <div className="space-y-2">
                  <Label className="text-xs font-medium tracking-wide uppercase">
                    Files on Bitrix deal
                  </Label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {data.bitrixFiles.slice(0, 8).map((f) => (
                      <div
                        key={`${f.field}-${f.id}`}
                        className="bg-muted/40 border-border/60 flex min-h-10 items-center gap-2 rounded-md border px-3 py-2 text-xs"
                      >
                        <FileText className="text-muted-foreground size-3.5 shrink-0" />
                        <span className="truncate">{f.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="screener-select">Screener</Label>
                <Select
                  value={screenerId}
                  onValueChange={setSelectedScreenerId}
                >
                  <SelectTrigger id="screener-select">
                    <SelectValue placeholder="Select screener" />
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

              {!hasIndexedDocs ? (
                <div className="space-y-3 rounded-lg border border-dashed p-4">
                  <Label>Upload (fallback)</Label>
                  <p className="text-muted-foreground text-xs">
                    Use this if documents are not yet indexed for this
                    opportunity.
                  </p>
                  <input
                    type="file"
                    onChange={(e) =>
                      setSelectedFile(e.target.files?.[0] ?? null)
                    }
                    className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-xs file:font-medium"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!selectedFile || uploadMutation.isPending}
                    onClick={async () => {
                      if (!selectedFile) return;
                      const fileData = await toBase64(selectedFile);
                      await uploadMutation.mutateAsync({
                        ...props,
                        fileName: selectedFile.name,
                        fileType:
                          selectedFile.type || "application/octet-stream",
                        fileData,
                        title: selectedFile.name,
                        description: "Uploaded from Bitrix screening widget",
                        category: "OTHER",
                      });
                    }}
                  >
                    {uploadMutation.isPending ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 size-4" />
                    )}
                    Upload & ingest
                  </Button>
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  disabled={!canRun}
                  onClick={() =>
                    runMutation.mutate({
                      ...props,
                      screenerId,
                    })
                  }
                >
                  {runMutation.isPending ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <Play className="mr-2 size-4" />
                  )}
                  Start screening
                </Button>
                {data.lastRun ? (
                  <p className="text-muted-foreground text-xs">
                    Last run: {data.lastRun.status}
                    {data.lastRun.screenerName
                      ? ` · ${data.lastRun.screenerName}`
                      : ""}
                  </p>
                ) : null}
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}
