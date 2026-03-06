import type { Company } from "db";
import type { Document } from "db/schema";
import { BulkFileUploadDialog } from "@/components/Dialogs/bulk-file-upload-dialog";
import DealDocumentItem from "@/components/DealDocumentItem";
import { AlertTriangle } from "lucide-react";

interface CompanyDocumentsProps {
  company: Company;
  documents: Document[];
}

export function CompanyDocuments({ company, documents }: CompanyDocumentsProps) {
  return (
    <div className="border-border space-y-4 border-b pb-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-muted-foreground text-sm font-medium">
          Company documents
        </h2>
        <BulkFileUploadDialog companyId={company.id} />
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
          <p className="text-sm font-medium text-foreground">
            No documents available
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            Upload files to attach them to this company.
          </p>
        </div>
      )}
    </div>
  );
}

