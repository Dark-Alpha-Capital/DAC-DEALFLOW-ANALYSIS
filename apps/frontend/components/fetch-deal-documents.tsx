import React from "react";
import { AlertTriangle } from "lucide-react";
import type { Document } from "@repo/db/schema";
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
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <AlertTriangle className="mb-4 h-10 w-10 text-muted-foreground" />
          <h3 className="text-sm font-medium text-foreground">
            No documents available
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            No documents have been created for this deal yet.
          </p>
        </div>
      )}
    </div>
  );
};

export default FetchDealDocuments;
