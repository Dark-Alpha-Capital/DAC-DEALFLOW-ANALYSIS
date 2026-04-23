import { AlertCircle, ArrowRight } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { DocumentListItem } from "./document-list-item";
import { DocumentStatusIcon } from "./document-status-icon";
import { IngestionProgressList } from "./ingestion-progress-list";
import { ModePicker } from "./mode-picker";
import { UploadQueue } from "./upload-queue";
import type {
  DealDocumentRow,
  DisplayIngestionPipelineRow,
  ScreeningMode,
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

  screeningMode: ScreeningMode;
  onChangeMode: (next: ScreeningMode) => void;

  targetDocumentId: string;
  setTargetDocumentId: (id: string) => void;

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

/**
 * A horizontal section divider with a small uppercase label. Replaces the
 * previous `<h3>`-inside-a-card pattern. Purely typographic; no border around.
 */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.16em] uppercase">
      {children}
    </p>
  );
}

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
    screeningMode,
    onChangeMode,
    targetDocumentId,
    setTargetDocumentId,
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

  // Only surface the aggregate ingest summary when it's actually informative:
  // something is in-flight OR something failed. Otherwise it's just noise.
  const showIngestSummary = Boolean(
    ingestSummary &&
      ingestSummary.total > 0 &&
      screeningMode === "rag" &&
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
          Mode &amp; documents
        </h2>
        <p className="text-muted-foreground max-w-[60ch] text-[13px] leading-relaxed">
          Choose how screening should use your files, then manage uploads. You
          can switch modes anytime before you run a screener.
        </p>
      </div>

      <ModePicker value={screeningMode} onChange={onChangeMode} />

      {canOpenStep2 ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[13px] leading-snug">
            <span className="text-foreground font-medium">
              {screeningMode === "rag"
                ? "Ready for multi-file screening."
                : "File selected for monograph screening."}
            </span>{" "}
            <span className="text-muted-foreground">
              {screeningMode === "rag"
                ? `${indexedCount} chunk${indexedCount === 1 ? "" : "s"} indexed.`
                : "Pick a screener template to continue."}
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

      {screeningMode === "rag" ? (
        <RagDocumentsList
          processedDocs={processedDocs}
          vectorWaitSec={vectorWaitSec}
          deleteDisabled={deleteDisabled}
          onRequestDelete={onRequestDelete}
        />
      ) : (
        <MonographDocumentsList
          processedDocs={processedDocs}
          pendingDocs={pendingDocs}
          targetDocumentId={targetDocumentId}
          setTargetDocumentId={setTargetDocumentId}
          deleteDisabled={deleteDisabled}
          onRequestDelete={onRequestDelete}
        />
      )}

      {screeningMode === "rag" && pendingDocs.length > 0 ? (
        <RagPendingDocumentsList
          pendingDocs={pendingDocs}
          deleteDisabled={deleteDisabled}
          onRequestDelete={onRequestDelete}
        />
      ) : null}

      {dealDocuments.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No files on this deal yet. Add files below to begin.
        </p>
      ) : null}

      <UploadQueue
        mode={screeningMode}
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
              {screeningMode === "rag"
                ? "At least one chunk must be indexed."
                : "Select one processed file, or upload and wait for indexing."}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function RagDocumentsList({
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

function RagPendingDocumentsList({
  pendingDocs,
  deleteDisabled,
  onRequestDelete,
}: {
  pendingDocs: DealDocumentRow[];
  deleteDisabled: boolean;
  onRequestDelete: (doc: DealDocumentRow) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <SectionLabel>All deal files</SectionLabel>
        <p className="text-muted-foreground max-w-[62ch] text-[12px] leading-relaxed">
          Includes files still indexing or failed. Only processed rows above
          feed RAG until they finish.
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
  );
}

function MonographDocumentsList({
  processedDocs,
  pendingDocs,
  targetDocumentId,
  setTargetDocumentId,
  deleteDisabled,
  onRequestDelete,
}: {
  processedDocs: DealDocumentRow[];
  pendingDocs: DealDocumentRow[];
  targetDocumentId: string;
  setTargetDocumentId: (id: string) => void;
  deleteDisabled: boolean;
  onRequestDelete: (doc: DealDocumentRow) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <SectionLabel>Select one file to screen</SectionLabel>
        <p className="text-muted-foreground max-w-[62ch] text-[12px] leading-relaxed">
          Only <span className="text-foreground">Processed</span> files can be
          selected. Upload a new file below, then pick it here once indexing
          finishes.
        </p>
      </div>
      {processedDocs.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No processed files yet. Upload a document and wait for ingestion to
          complete.
        </p>
      ) : (
        <RadioGroup
          value={targetDocumentId}
          onValueChange={setTargetDocumentId}
          className="divide-border/60 border-border/60 grid divide-y border-y"
        >
          {processedDocs.map((doc) => {
            const htmlId = `bitrix-monograph-doc-${doc.id}`;
            const selected = targetDocumentId === doc.id;
            return (
              <label
                key={doc.id}
                htmlFor={htmlId}
                className={cn(
                  "group flex cursor-pointer items-center gap-3 border-l-2 py-2.5 pr-2 pl-3 transition-colors",
                  selected
                    ? "border-foreground"
                    : "border-transparent hover:border-border",
                )}
              >
                <RadioGroupItem
                  value={doc.id}
                  id={htmlId}
                  className="shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block truncate text-sm leading-snug",
                      selected
                        ? "text-foreground font-medium"
                        : "text-foreground/85",
                    )}
                  >
                    {doc.fileName}
                  </span>
                  <span className="text-muted-foreground mt-0.5 block text-[11px]">
                    Full text included in every question
                  </span>
                </div>
                <DocumentStatusIcon status={doc.ingestionStatus} />
              </label>
            );
          })}
        </RadioGroup>
      )}
      {pendingDocs.length > 0 ? (
        <div className="space-y-2">
          <SectionLabel>Not ready yet</SectionLabel>
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
    </div>
  );
}
