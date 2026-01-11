import db, { sims, eq } from "db";
import { DealType } from "db/schema";
import React from "react";
import SimItem from "@/components/SimItem";
import { AlertTriangle } from "lucide-react";
import { cacheLife, cacheTag } from "next/cache";

// this component will be used to fetch and display all sims for a particular deal

const FetchDealSim = async ({
  dealId,
  dealType,
}: {
  dealId: string;
  dealType: DealType;
}) => {
  "use cache";
  // dealId becomes part of cache key
  cacheTag(`deal-sims-${dealId}`);
  cacheLife("hours");

  const dealSims = await db.select().from(sims).where(eq(sims.dealId, dealId));

  return (
    <div>
      {dealSims.length > 0 ? (
        dealSims.map((sim) => (
          <SimItem
            key={sim.id}
            title={sim.title}
            description={sim.caption}
            status={sim.status}
            cimId={sim.id}
            dealId={dealId}
            dealType={dealType}
            fileUrl={sim.fileUrl}
          />
        ))
      ) : (
        <div className="flex flex-col items-center justify-center text-center">
          <AlertTriangle className="mb-4 h-12 w-12 text-destructive" />
          <h3 className="text-lg font-semibold">No SIMs Available</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            No Strategic Investment Memos have been created for this deal yet.
          </p>
          <p className="text-sm text-muted-foreground">Create First SIM</p>
        </div>
      )}
    </div>
  );
};

export default FetchDealSim;
