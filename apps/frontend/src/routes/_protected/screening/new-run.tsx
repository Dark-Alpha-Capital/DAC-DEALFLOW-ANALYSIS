import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import useCurrentUser from "@/hooks/use-current-user";
import { useRouter } from "@/lib/navigation-shim";
import { QUEUE_NAMES } from "@repo/redis-queue/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { loadCimScreeningNewRunData } from "@/lib/server/cim-screening-route-data";
import {
  ROUTE_DATA_GC_TIME_MS,
  ROUTE_DATA_STALE_TIME_MS,
} from "@/lib/route-loader-cache";
import BackButton from "@/components/Buttons/back-button";

export const Route = createFileRoute("/_protected/screening/new-run")({
  staleTime: ROUTE_DATA_STALE_TIME_MS,
  gcTime: ROUTE_DATA_GC_TIME_MS,
  head: () => ({
    meta: [{ title: "New screening run — Dark Alpha Capital" }],
  }),
  loader: async () => loadCimScreeningNewRunData(),
  component: ScreeningNewRunPage,
});

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

async function sha256Hex(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function wait(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function ScreeningNewRunPage() {
  const {
    screeners: initialScreeners,
    opportunities: initialOpportunities,
    libraryDocs: initialLibraryDocs,
  } = Route.useLoaderData();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const navigate = Route.useNavigate();
  const router = useRouter();
  const user = useCurrentUser();

  const [dealScreenerId, setDealScreenerId] = useState("");
  const [dealOpportunityId, setDealOpportunityId] = useState("");

  const [documentScreenerId, setDocumentScreenerId] = useState("");
  const [documentId, setDocumentId] = useState("");

  const [uploadScreenerId, setUploadScreenerId] = useState("");
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const { data: screeners = [] } = useQuery({
    ...trpc.screeners.getAll.queryOptions(),
    initialData: initialScreeners,
  });
  const { data: opportunities = [] } = useQuery({
    ...trpc.dealOpportunities.searchForChat.queryOptions({
      query: "",
      limit: 100,
    }),
    initialData: initialOpportunities,
  });
  const { data: libraryDocs = [], isLoading: libraryDocsLoading } = useQuery({
    ...trpc.simScreening.listLibraryDocuments.queryOptions(),
    initialData: initialLibraryDocs,
  });

  const startDealRun = useMutation(
    trpc.dealOpportunities.startTemplateScreening.mutationOptions({
      onSuccess: (data) => {
        window.dispatchEvent(
          new CustomEvent("newJobs", {
            detail: [
              {
                jobId: data.jobId,
                fileName: "Deal opportunity",
                userId: user?.id ?? "",
                queueName: QUEUE_NAMES.SIM_SCREENING,
              },
            ],
          }),
        );
        toast.success("Screening run started");
        void navigate({
          to: "/screening/$sessionId",
          params: { sessionId: data.sessionId },
          search: { runId: data.runId },
        });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to start deal screening");
      },
    }),
  );

  const startDocumentRun = useMutation(
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
        toast.success("Screening run started");
        void navigate({
          to: "/screening/$sessionId",
          params: { sessionId: data.sessionId },
          search: { runId: data.runId },
        });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to start document screening");
      },
    }),
  );

  const uploadGlobalDocument = useMutation(
    trpc.files.uploadGlobalDocument.mutationOptions(),
  );

  const startDeal = () => {
    if (!dealOpportunityId || !dealScreenerId) return;
    startDealRun.mutate({ dealOpportunityId, screenerId: dealScreenerId });
  };

  const startFromExistingDocument = () => {
    if (!documentId || !documentScreenerId) return;
    startDocumentRun.mutate({ documentId, screenerId: documentScreenerId });
  };

  const startFromUpload = async () => {
    if (!uploadFile || !uploadScreenerId || !uploadTitle.trim()) {
      return;
    }

    if (!uploadFile.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Upload must be a PDF file");
      return;
    }

    try {
      const hash = await sha256Hex(uploadFile);
      const duplicateResult = await queryClient.fetchQuery(
        trpc.files.checkDuplicate.queryOptions({
          scopeType: "GLOBAL",
          contentHash: hash,
        }),
      );

      if (duplicateResult.isDuplicate) {
        toast.warning("Document already uploaded", {
          description:
            "This file already exists in your firm library. Pick it from Existing document.",
        });
        return;
      }

      const fileData = await readFileAsDataURL(uploadFile);
      const uploadRes = await uploadGlobalDocument.mutateAsync({
        category: "CIM",
        title: uploadTitle.trim(),
        description: undefined,
        fileData,
        fileName: uploadFile.name,
        fileType: "application/pdf",
      });

      toast.success("Document uploaded", {
        description: "Waiting for ingestion so screening can start.",
      });

      let isReady = false;
      for (let i = 0; i < 45; i += 1) {
        await wait(2000);
        const docs = await queryClient.fetchQuery(
          trpc.simScreening.listLibraryDocuments.queryOptions(),
        );
        const uploadedDoc = docs.find((doc) => doc.id === uploadRes.documentId);
        if (uploadedDoc?.ingestionStatus === "PROCESSED") {
          isReady = true;
          break;
        }
        if (uploadedDoc?.ingestionStatus === "FAILED") {
          toast.error(
            uploadedDoc.ingestionError ||
              "Document ingestion failed; cannot start screening.",
          );
          return;
        }
      }

      if (!isReady) {
        toast.warning("Document is still processing", {
          description:
            "Use Existing document once ingestion finishes to start screening.",
        });
        void router.invalidate();
        return;
      }

      await startDocumentRun.mutateAsync({
        documentId: uploadRes.documentId,
        screenerId: uploadScreenerId,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to upload and start run";
      toast.error(message);
    }
  };

  const existingDoc = libraryDocs.find((doc) => doc.id === documentId);

  return (
    <section className="block-space-mini container max-w-5xl space-y-6">
      <div>
        <BackButton label="Back" />
      </div>

      <div>
        <h1 className="text-3xl font-semibold md:text-4xl">
          New screening run
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Start from a deal opportunity, an existing document, or a new document
          upload.
        </p>
      </div>

      <Tabs defaultValue="deal" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="deal">Deal opportunity</TabsTrigger>
          <TabsTrigger value="document">Existing document</TabsTrigger>
          <TabsTrigger value="upload">Upload document</TabsTrigger>
        </TabsList>

        <TabsContent value="deal">
          <Card>
            <CardHeader>
              <CardTitle>Run for deal opportunity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Deal opportunity</Label>
                <Select
                  value={dealOpportunityId}
                  onValueChange={setDealOpportunityId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select deal opportunity" />
                  </SelectTrigger>
                  <SelectContent>
                    {opportunities.map((opp) => (
                      <SelectItem key={opp.id} value={opp.id}>
                        {(opp.companyName || "Unknown company").trim()} -{" "}
                        {(opp.dealTeaser || "Untitled opportunity").trim()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Screener template</Label>
                <Select
                  value={dealScreenerId}
                  onValueChange={setDealScreenerId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select screener" />
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
              <Button
                onClick={startDeal}
                disabled={
                  !dealOpportunityId ||
                  !dealScreenerId ||
                  startDealRun.isPending
                }
              >
                {startDealRun.isPending && (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                )}
                Start screening
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="document">
          <Card>
            <CardHeader>
              <CardTitle>Run for existing document</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Document</Label>
                <Select value={documentId} onValueChange={setDocumentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select document" />
                  </SelectTrigger>
                  <SelectContent>
                    {libraryDocs.map((doc) => (
                      <SelectItem
                        key={doc.id}
                        value={doc.id}
                        disabled={doc.ingestionStatus !== "PROCESSED"}
                      >
                        {doc.title} ({doc.ingestionStatus})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {libraryDocsLoading ? (
                  <p className="text-muted-foreground text-xs">
                    Loading documents…
                  </p>
                ) : null}
                {existingDoc && existingDoc.ingestionStatus !== "PROCESSED" ? (
                  <p className="text-muted-foreground text-xs">
                    This document is still processing.
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label>Screener template</Label>
                <Select
                  value={documentScreenerId}
                  onValueChange={setDocumentScreenerId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select screener" />
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
              <Button
                onClick={startFromExistingDocument}
                disabled={
                  !documentId ||
                  !documentScreenerId ||
                  startDocumentRun.isPending ||
                  existingDoc?.ingestionStatus !== "PROCESSED"
                }
              >
                {startDocumentRun.isPending && (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                )}
                Start screening
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upload">
          <Card>
            <CardHeader>
              <CardTitle>Upload new document and run</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Document title</Label>
                <Input
                  value={uploadTitle}
                  onChange={(event) => setUploadTitle(event.target.value)}
                  placeholder="Enter document title"
                />
              </div>
              <div className="space-y-2">
                <Label>PDF file</Label>
                <Input
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(event) => {
                    const selected = event.target.files?.[0] ?? null;
                    setUploadFile(selected);
                    if (selected && !uploadTitle.trim()) {
                      setUploadTitle(selected.name.replace(/\.pdf$/i, ""));
                    }
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Screener template</Label>
                <Select
                  value={uploadScreenerId}
                  onValueChange={setUploadScreenerId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select screener" />
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
              <Button
                onClick={() => void startFromUpload()}
                disabled={
                  !uploadFile ||
                  !uploadScreenerId ||
                  !uploadTitle.trim() ||
                  uploadGlobalDocument.isPending ||
                  startDocumentRun.isPending
                }
              >
                {(uploadGlobalDocument.isPending ||
                  startDocumentRun.isPending) && (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                )}
                <Upload className="mr-2 size-4" />
                Upload and start
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </section>
  );
}
