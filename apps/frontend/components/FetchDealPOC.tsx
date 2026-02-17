import { POC } from "db/schema";
import AddPocDialog from "./Dialogs/add-poc-dialog";
import DeletePocButton from "./Buttons/delete-poc-button";

const FetchDealPOC = ({
  dealId,
  pocs,
}: {
  dealId: string;
  pocs: POC[];
}) => {
  return (
    <div className="space-y-4">
      <AddPocDialog dealId={dealId} />

      {pocs.length > 0 ? (
        <ul className="space-y-0">
          {pocs.map((poc) => (
            <li
              key={poc.id}
              className="flex items-center justify-between gap-4 border-b border-border py-4 transition-colors hover:bg-muted/40"
            >
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="text-sm font-medium text-foreground">
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
        <p className="py-4 text-sm text-muted-foreground">
          No points of contact found for this deal.
        </p>
      )}
    </div>
  );
};

export default FetchDealPOC;
