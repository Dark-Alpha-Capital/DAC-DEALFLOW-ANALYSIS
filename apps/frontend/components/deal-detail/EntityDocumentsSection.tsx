import type { Document } from "@repo/db/schema";
import { FileUploadDialog } from "@/components/Dialogs/file-upload-dialog";
import DealDocumentItem from "@/components/DealDocumentItem";
import { AlertTriangle } from "lucide-react";

type EntityType = "COMPANY" | "DEAL_OPPORTUNITY";

interface EntityDocumentsSectionProps {
  title: string;
  entityType: EntityType;
  entityId: string;
  documents: Document[];
  emptyMessage?: string;
}

export function EntityDocumentsSection({
  title,
  entityType,
  entityId,
  documents,
  emptyMessage = "No documents available.",
}: EntityDocumentsSectionProps) {
  return (
    <div className="border-border space-y-4 border-b pb-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-muted-foreground text-sm font-medium">{title}</h2>
        <FileUploadDialog entityType={entityType} entityId={entityId} />
      </div>
      {documents.length > 0 ? (
        <div className="space-y-3">
          {documents.map((document) => (
            <DealDocumentItem
              key={document.id}
              title={document.title}
              description={document.description || ""}
              caption={null}
              category={document.category}
              fileUrl={document.fileUrl}
              tags={[]}
              fileName={document.fileName}
              fileType={document.mimeType}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <AlertTriangle className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">{emptyMessage}</p>
        </div>
      )}
    </div>
  );
}
