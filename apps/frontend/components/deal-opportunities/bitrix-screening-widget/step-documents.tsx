import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DocumentListItem } from "./document-list-item";
import { IngestionProgressList } from "./ingestion-progress-list";
import { UploadQueue } from "./upload-queue";
import type {
  DealDocumentRow,
  DisplayIngestionPipelineRow,
} from "./types";
import type { IngestionSummary } from "./utils";

type StepDocumentsProps = {
  indexed: boolean;
  processedDocs: DealDocumentRow[];
  pendingDocs: DealDocumentRow[];
  pipelineRows: DisplayIngestionPipelineRow[];
  ingestSummary: IngestionSummary | null;
  screeningModeBadge: string | null;
  uploadFiles: File[];
  onPickFiles: (picked: File[]) => void;
  onRemovePending: (key: string) => void;
  onUpload: () => void;
  uploading: boolean;
  deleteDisabled: boolean;
  onRequestDelete: (doc: DealDocumentRow) => void;
  onCancelPipelineRow?: (row: DisplayIngestionPipelineRow) => void;
  cancellingPipelineKeys?: ReadonlySet<string>;
};

const MODE_LABEL: Record<string, string> = {
  monograph: "Single-file (monograph)",
  rag: "Multi-file (RAG)",
};

export function StepDocuments(props: StepDocumentsProps) {
  const {
    indexed,
    processedDocs,
    pendingDocs,
    pipelineRows,
    ingestSummary,
    screeningModeBadge,
    uploadFiles,
    onPickFiles,
    onRemovePending,
    onUpload,
    uploading,
    deleteDisabled,
    onRequestDelete,
    onCancelPipelineRow,
    cancellingPipelineKeys,
  } = props;

  const showIngestSummary = Boolean(
    ingestSummary &&
      ingestSummary.total > 0 &&
      (ingestSummary.inFlight > 0 || ingestSummary.failed > 0),
  );

  const everythingFailed = Boolean(
    ingestSummary &&
      ingestSummary.inFlight === 0 &&
      !indexed &&
      ingestSummary.total > 0 &&
      ingestSummary.failed === ingestSummary.total,
  );

  return (
    <section aria-labelledby="step-ingest-title" className="space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2
          id="step-ingest-title"
          className="text-lg font-semibold tracking-[-0.01em]"
        >
          Documents
        </h2>
        {screeningModeBadge ? (
          <Badge variant="outline" className="border-border/20 text-xs font-medium">
            {MODE_LABEL[screeningModeBadge] ?? screeningModeBadge}
          </Badge>
        ) : null}
      </div>

      {pipelineRows.length > 0 ? (
        <div className="border-border/20 bg-muted/10 rounded-lg border p-3 space-y-2">
          <p className="text-foreground text-xs font-medium tracking-tight">
            Indexing files
          </p>
          <IngestionProgressList
            rows={pipelineRows}
            onCancelRow={onCancelPipelineRow}
            cancellingKeys={cancellingPipelineKeys}
          />
        </div>
      ) : showIngestSummary && ingestSummary ? (
        <div className="border-border/20 bg-muted/10 rounded-lg border p-3 space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
            <span className="text-foreground font-medium">File indexing</span>
            <span className="text-muted-foreground tabular-nums">
              {ingestSummary.finishedPipeline} of {ingestSummary.total} finished
            </span>
          </div>
          <Progress value={ingestSummary.pct} className="h-1" aria-label="Document indexing progress" />
        </div>
      ) : null}

      {everythingFailed ? (
        <Alert variant="destructive">
          <AlertCircle aria-hidden />
          <AlertTitle>Nothing indexed yet</AlertTitle>
          <AlertDescription className="text-xs">
            Every file failed or was skipped without searchable chunks. Try another format or re-upload.
          </AlertDescription>
        </Alert>
      ) : null}

      {processedDocs.length > 0 ? (
        <div className="space-y-1">
          <p className="text-foreground text-xs font-medium tracking-tight">
            Indexed for screening
          </p>
          <ul className="divide-border/20 divide-y">
            {processedDocs.map((doc) => (
              <DocumentListItem
                key={doc.id}
                doc={doc}
                variant="processed"
                deletingDisabled={deleteDisabled}
                onDelete={onRequestDelete}
              />
            ))}
          </ul>
        </div>
      ) : null}

      {pendingDocs.length > 0 ? (
        <div className="space-y-1">
          <p className="text-foreground text-xs font-medium tracking-tight">
            Other deal files
          </p>
          <ul className="divide-border/20 divide-y">
            {pendingDocs.map((doc) => (
              <DocumentListItem
                key={doc.id}
                doc={doc}
                variant="pending"
                deletingDisabled={deleteDisabled}
                onDelete={onRequestDelete}
              />
            ))}
          </ul>
        </div>
      ) : null}

      <UploadQueue
        files={uploadFiles}
        onPick={onPickFiles}
        onRemove={onRemovePending}
        onUpload={onUpload}
        uploading={uploading}
      />
    </section>
  );
}
