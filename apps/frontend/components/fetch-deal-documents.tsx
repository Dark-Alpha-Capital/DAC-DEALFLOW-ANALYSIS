import prismaDB from "@/lib/prisma";
import React from "react";
import { AlertTriangle } from "lucide-react";
import { DealType } from "@prisma/client";
import DealDocumentItem from "./DealDocumentItem";

const FetchDealDocuments = async ({
  dealId,
  dealType,
}: {
  dealId: string;
  dealType: DealType;
}) => {
  const dealDocuments = await prismaDB.dealDocument.findMany({
    where: {
      dealId: dealId,
    },
  });

  return (
    <div>
      {dealDocuments.length > 0 ? (
        dealDocuments.map((dealDocument) => (
          <DealDocumentItem
            key={dealDocument.id}
            title={dealDocument.title}
            description={dealDocument.description || ""}
            category={dealDocument.category}
            documentId={dealDocument.id}
            dealId={dealId}
            dealType={dealType}
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
