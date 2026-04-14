import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, Play, Upload, FileText } from "lucide-react";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

  const screeners = bootstrap.data?.screeners ?? [];
  const screenerId = selectedScreenerId || screeners[0]?.id || "";
  const hasIndexedDocs = (bootstrap.data?.indexedCount ?? 0) > 0;
  const hasBitrixFiles = bootstrap.data?.hasFiles ?? false;
  const canRun = !!screenerId && hasIndexedDocs && !runMutation.isPending;

  const helper = useMemo(() => {
    if (hasIndexedDocs)
      return `${bootstrap.data?.indexedCount ?? 0} indexed chunks ready`;
    if (hasBitrixFiles)
      return "Bitrix files found. Upload one file to ingest in this app first.";
    return "No files found on the deal. Upload a file below to continue.";
  }, [bootstrap.data?.indexedCount, hasBitrixFiles, hasIndexedDocs]);

  return (
    <section className="mx-auto w-full max-w-3xl space-y-4 px-3 py-4 sm:px-4">
      <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
        <CardHeader className="space-y-2 pb-2">
          <CardTitle className="text-base sm:text-lg">
            Bitrix Deal Screening
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            Pick a screener, ingest files if needed, and launch screening from
            this deal.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          {bootstrap.isLoading ? (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Loading widget context...
            </div>
          ) : bootstrap.error ? (
            <Alert variant="destructive">
              <AlertDescription>
                {bootstrap.error.message || "Failed to load widget context"}
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <Alert>
                <AlertDescription>{helper}</AlertDescription>
              </Alert>

              {bootstrap.data?.bitrixFiles?.length ? (
                <div className="space-y-2">
                  <Label className="text-xs font-medium tracking-wide uppercase">
                    Files detected in Bitrix
                  </Label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {bootstrap.data.bitrixFiles.slice(0, 6).map((f) => (
                      <div
                        key={`${f.field}-${f.id}`}
                        className="bg-muted/40 border-border/60 flex items-center gap-2 rounded-md border px-3 py-2 text-xs"
                      >
                        <FileText className="text-muted-foreground size-3.5" />
                        <span className="truncate">{f.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="space-y-2">
                <Label>Screener</Label>
                <Select
                  value={screenerId}
                  onValueChange={setSelectedScreenerId}
                >
                  <SelectTrigger>
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
                <div className="space-y-3 rounded-md border p-3">
                  <Label>Upload file fallback</Label>
                  <input
                    type="file"
                    onChange={(e) =>
                      setSelectedFile(e.target.files?.[0] ?? null)
                    }
                    className="block w-full text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
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

              <div className="flex flex-wrap items-center gap-2">
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
                {bootstrap.data?.lastRun ? (
                  <p className="text-muted-foreground text-xs">
                    Last run: {bootstrap.data.lastRun.status}
                  </p>
                ) : null}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
