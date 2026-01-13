import React from "react";
import { AlertTriangle } from "lucide-react";
import { DealDocument } from "db/schema";
import DealDocumentItem from "./DealDocumentItem";

const FetchDealDocuments = ({
  dealId,
  documents,
}: {
  dealId: string;
  documents: DealDocument[];
}) => {
  return (
    <div>
      {documents.length > 0 ? (
        documents.map((dealDocument) => (
          <DealDocumentItem
            key={dealDocument.id}
            title={dealDocument.title}
            description={dealDocument.description || ""}
            caption={dealDocument.caption}
            category={dealDocument.category}
            fileUrl={dealDocument.documentUrl}
            tags={dealDocument.tags || []}
            fileName={dealDocument.fileName}
            fileType={dealDocument.fileType}
          />
        ))
      ) : (
        <div className="flex flex-col items-center justify-center text-center">
          <AlertTriangle className="mb-4 h-12 w-12 text-destructive" />
          <h3 className="text-lg font-semibold">No Documents Available</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            No documents have been created for this deal yet.
          </p>
          <p className="text-sm text-muted-foreground">Create First Document</p>
        </div>
      )}
    </div>
  );
};

export default FetchDealDocuments;
