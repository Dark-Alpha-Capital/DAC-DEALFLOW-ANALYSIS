import type { Document } from "@repo/db/schema";
import { FileUploadDialog } from "@/components/Dialogs/file-upload-dialog";
import { UploadCIMDialog } from "@/components/Dialogs/upload-cim-dialog";
import DealDocumentItem from "@/components/DealDocumentItem";
import { AlertTriangle } from "lucide-react";

type EntityType = "COMPANY" | "DEAL_OPPORTUNITY";

interface EntityDocumentsSectionProps {
  title: string;
  entityType: EntityType;
  entityId: string;
  documents: Document[];
  emptyMessage?: string;
  cimUploadProps?: { dealOpportunityId: string; entityName: string };
}

export function EntityDocumentsSection({
  title,
  entityType,
  entityId,
  documents,
  emptyMessage = "No documents available.",
  cimUploadProps,
}: EntityDocumentsSectionProps) {
  return (
    <div className="border-border space-y-4 border-b pb-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-muted-foreground text-sm font-medium">{title}</h2>
        <div className="flex items-center gap-2">
          {cimUploadProps && (
            <UploadCIMDialog
              dealOpportunityId={cimUploadProps.dealOpportunityId}
              entityName={cimUploadProps.entityName}
            />
          )}
          <FileUploadDialog entityType={entityType} entityId={entityId} />
        </div>
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
          <AlertTriangle className="text-muted-foreground mb-3 h-8 w-8" />
          <p className="text-foreground text-sm font-medium">{emptyMessage}</p>
        </div>
      )}
    </div>
  );
}
