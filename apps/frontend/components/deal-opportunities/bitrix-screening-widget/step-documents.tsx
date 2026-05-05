import { AlertCircle, ArrowRight } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { DocumentListItem } from "./document-list-item";
import { IngestionProgressList } from "./ingestion-progress-list";
import { UploadQueue } from "./upload-queue";
import type {
  DealDocumentRow,
  DisplayIngestionPipelineRow,
  WizardStep,
} from "./types";
import type { IngestionSummary } from "./utils";

type StepDocumentsProps = {
  dealDocuments: DealDocumentRow[];
  indexedCount: number;
  indexed: boolean;
  vectorWaitSec: number;
  processedDocs: DealDocumentRow[];
  pendingDocs: DealDocumentRow[];
  pipelineRows: DisplayIngestionPipelineRow[];
  ingestSummary: IngestionSummary | null;

  screeningModeBadge: string | null;

  canOpenStep2: boolean;
  goStep: (s: WizardStep) => void;

  uploadFiles: File[];
  onPickFiles: (picked: File[]) => void;
  onRemovePending: (key: string) => void;
  onUpload: () => void;
  uploading: boolean;

  deleteDisabled: boolean;
  onRequestDelete: (doc: DealDocumentRow) => void;
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.16em] uppercase">
      {children}
    </p>
  );
}

const MODE_LABEL: Record<string, string> = {
  monograph: "Single-file (monograph)",
  rag: "Multi-file (RAG)",
};

export function StepDocuments(props: StepDocumentsProps) {
  const {
    dealDocuments,
    indexedCount,
    indexed,
    vectorWaitSec,
    processedDocs,
    pendingDocs,
    pipelineRows,
    ingestSummary,
    screeningModeBadge,
    canOpenStep2,
    goStep,
    uploadFiles,
    onPickFiles,
    onRemovePending,
    onUpload,
    uploading,
    deleteDisabled,
    onRequestDelete,
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
    <section aria-labelledby="step-ingest-title" className="space-y-10">
      <div className="space-y-2">
        <h2
          id="step-ingest-title"
          className="text-lg font-semibold tracking-tight"
        >
          Documents
        </h2>
        <p className="text-muted-foreground max-w-[60ch] text-[13px] leading-relaxed">
          Screening mode is determined automatically from the files you upload.
          One processed file uses monograph; multiple files use RAG across all
          indexed chunks.
        </p>
      </div>

      {screeningModeBadge ? (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">Mode:</span>
          <Badge variant="outline" className="border-border/60 text-xs">
            {MODE_LABEL[screeningModeBadge] ?? screeningModeBadge}
          </Badge>
        </div>
      ) : null}

      {canOpenStep2 ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[13px] leading-snug">
            <span className="text-foreground font-medium">
              Ready for screening.
            </span>{" "}
            <span className="text-muted-foreground">
              {indexedCount} chunk{indexedCount === 1 ? "" : "s"} indexed.
            </span>
          </p>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-foreground hover:bg-muted/50 -mr-2 cursor-pointer gap-1.5"
            onClick={() => goStep(2)}
          >
            Continue to screener
            <ArrowRight className="size-3.5" aria-hidden />
          </Button>
        </div>
      ) : null}

      {pipelineRows.length > 0 ? (
        <div className="space-y-3">
          <SectionLabel>In progress</SectionLabel>
          <IngestionProgressList rows={pipelineRows} />
        </div>
      ) : null}

      {showIngestSummary && ingestSummary ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-xs">
            <span className="text-foreground font-medium">File indexing</span>
            <span className="text-muted-foreground tabular-nums">
              {ingestSummary.finishedPipeline} of {ingestSummary.total} finished
            </span>
          </div>
          <Progress
            value={ingestSummary.pct}
            className="h-[3px]"
            aria-label="Document indexing progress"
          />
          <p className="text-muted-foreground text-xs leading-relaxed">
            {ingestSummary.inFlight > 0
              ? "Large files can take a few minutes. This view refreshes until each file is indexed."
              : "Some files failed — fix or re-upload those. Others may still be usable."}
          </p>
        </div>
      ) : null}

      {everythingFailed ? (
        <Alert variant="destructive">
          <AlertCircle aria-hidden />
          <AlertTitle>Nothing indexed yet</AlertTitle>
          <AlertDescription className="text-xs">
            Every file failed or was skipped without searchable chunks. Try
            another format or re-upload.
          </AlertDescription>
        </Alert>
      ) : null}

      <ProcessedDocumentsList
        processedDocs={processedDocs}
        vectorWaitSec={vectorWaitSec}
        deleteDisabled={deleteDisabled}
        onRequestDelete={onRequestDelete}
      />

      {pendingDocs.length > 0 ? (
        <div className="space-y-3">
          <div className="space-y-1">
            <SectionLabel>All deal files</SectionLabel>
            <p className="text-muted-foreground max-w-[62ch] text-[12px] leading-relaxed">
              Includes files still indexing or failed. Only processed rows above
              feed screening until they finish.
            </p>
          </div>
          <ul className="divide-border/60 border-border/60 divide-y border-y">
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

      {dealDocuments.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No files on this deal yet. Add files below to begin.
        </p>
      ) : null}

      <UploadQueue
        files={uploadFiles}
        onPick={onPickFiles}
        onRemove={onRemovePending}
        onUpload={onUpload}
        uploading={uploading}
      />

      <div className="border-border/60 flex flex-wrap items-center justify-between gap-2 border-t pt-5">
        <span className="text-muted-foreground text-[10px] font-semibold tracking-[0.16em] uppercase">
          Step 1 of 3
        </span>
        <div className="flex flex-col items-end gap-1.5">
          <Button
            type="button"
            className="cursor-pointer gap-1.5"
            disabled={!canOpenStep2}
            onClick={() => goStep(2)}
          >
            Next: Screener
            <ArrowRight className="size-3.5" aria-hidden />
          </Button>
          {!canOpenStep2 ? (
            <p className="text-muted-foreground max-w-[32ch] text-right text-[11px] leading-snug">
              At least one chunk must be indexed.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function ProcessedDocumentsList({
  processedDocs,
  vectorWaitSec,
  deleteDisabled,
  onRequestDelete,
}: {
  processedDocs: DealDocumentRow[];
  vectorWaitSec: number;
  deleteDisabled: boolean;
  onRequestDelete: (doc: DealDocumentRow) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <SectionLabel>Indexed for screening</SectionLabel>
        <p className="text-muted-foreground max-w-[62ch] text-[12px] leading-relaxed">
          These files have finished ingestion and contribute to the deal index.
          After you start, the server waits {vectorWaitSec}s so the vector index
          can settle.
        </p>
      </div>
      {processedDocs.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No processed files yet. Upload below and wait until status shows
          Processed.
        </p>
      ) : (
        <ul className="divide-border/60 border-border/60 divide-y border-y">
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
      )}
    </div>
  );
}
