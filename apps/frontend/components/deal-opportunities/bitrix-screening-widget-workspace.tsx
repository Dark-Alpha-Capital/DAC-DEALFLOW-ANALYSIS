import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, Play, Upload } from "lucide-react";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  dealId: string;
  memberId: string;
  expiresAt: number;
  authSig: string;
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
    <section className="mx-auto w-full max-w-3xl space-y-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle>Bitrix Deal Screening</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {bootstrap.isLoading ? (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Loading widget context...
            </div>
          ) : (
            <>
              <p className="text-muted-foreground text-sm">{helper}</p>

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
                <div className="space-y-2">
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
            </>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
