import React from "react";
import { AlertTriangle } from "lucide-react";
import { Document } from "db/schema";
import DealDocumentItem from "./DealDocumentItem";

const FetchDealDocuments = ({
  dealId,
  documents,
}: {
  dealId: string;
  documents: Document[];
}) => {
  return (
    <div>
      {documents.length > 0 ? (
        documents.map((document) => (
          <DealDocumentItem
            key={document.id}
            title={document.title}
            description={document.description || ""}
            caption={document.caption}
            category={document.category}
            fileUrl={document.fileUrl}
            tags={document.tags || []}
            fileName={document.fileName}
            fileType={document.mimeType}
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
