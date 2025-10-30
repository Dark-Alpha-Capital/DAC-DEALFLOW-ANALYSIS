import prismaDB from "@/lib/prisma";
import React from "react";
import SimItem from "@/components/SimItem";
import { AlertTriangle } from "lucide-react";
import { Button } from "./ui/button";
import { DealType } from "@prisma/client";

// this component will be used to fetch and display all sims for a particular deal

const FetchDealSim = async ({
  dealId,
  dealType,
}: {
  dealId: string;
  dealType: DealType;
}) => {
  const sims = await prismaDB.sIM.findMany({
    where: {
      dealId: dealId,
    },
  });

  return (
    <div>
      {sims.length > 0 ? (
        sims.map((sim) => (
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
          <AlertTriangle className="mb-4 h-12 w-12 text-red-600 dark:text-red-400" />
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
