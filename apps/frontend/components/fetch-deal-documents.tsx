import React from "react";
import { AlertTriangle } from "lucide-react";
import { getDealDocuments } from "db/queries";
import DealDocumentItem from "./DealDocumentItem";
import { cacheLife, cacheTag } from "next/cache";

const FetchDealDocuments = async ({ dealId }: { dealId: string }) => {
  "use cache";
  // dealId becomes part of cache key
  cacheTag(`deal-documents-${dealId}`);
  cacheLife("hours");

  let dealDocuments = null;
  try {
    dealDocuments = await getDealDocuments(dealId);
  } catch (error) {
    console.error("Error fetching deal documents", error);
    dealDocuments = null;
  }

  if (!dealDocuments) {
    return <div>Error fetching deal documents</div>;
  }

  return (
    <div>
      {dealDocuments.length > 0 ? (
        dealDocuments.map((dealDocument) => (
          <DealDocumentItem
            key={dealDocument.id}
            title={dealDocument.title}
            description={dealDocument.description || ""}
            category={dealDocument.category}
            fileUrl={dealDocument.documentUrl}
          />
        ))
      ) : (
        <div className="flex flex-col items-center justify-center text-center">
          <AlertTriangle className="mb-4 h-12 w-12 text-red-600 dark:text-red-400" />
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
