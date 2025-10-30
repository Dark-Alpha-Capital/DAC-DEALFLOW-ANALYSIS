import { DealType } from "@prisma/client";
import React from "react";
import { getDealPOC } from "@/lib/queries";
import { Plus, Trash } from "lucide-react";
import { Button } from "./ui/button";
import AddPocDialog from "./Dialogs/add-poc-dialog";
import DeletePocButton from "./Buttons/delete-poc-button";

const FetchDealPOC = async ({
  dealId,
  dealType,
}: {
  dealId: string;
  dealType: DealType;
}) => {
  const pocs = await getDealPOC(dealId);
  return (
    <div className="space-y-4">
      <AddPocDialog dealId={dealId} />

      {pocs.length > 0 ? (
         <ul className="space-y-3 p-4">
          {pocs.map((poc) => (
            <li
              key={poc.id}
              className="flex items-center justify-between rounded-lg border bg-card p-4 shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <div className="flex-grow space-y-1.5 pr-4">
                <p className="text-sm font-semibold leading-tight">
                  {poc.name}
                </p>
                <p className="text-xs text-muted-foreground">{poc.email}</p>
                {poc.workPhone && (
                  <p className="text-xs text-muted-foreground">
                    {poc.workPhone}
                  </p>
                )}
              </div>
              <DeletePocButton pocId={poc.id} dealId={dealId} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-center text-sm text-muted-foreground">
          No points of contact found for this deal.
        </div>
      )}
    </div>
  );
};

export default FetchDealPOC;
