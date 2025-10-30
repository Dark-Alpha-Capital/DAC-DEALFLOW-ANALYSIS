import React, { Suspense } from "react";
import BitrixDealCard from "@/components/bitrix-deal-card";
import { BitrixDealCardSkeleton } from "@/components/skeletons/BitrixDealCardSkeleton";

const PublishedDealsPage = async () => {
  return (
    <section className="block-space big-container">
      <h2>Published Deals</h2>
      <p>These deals were published to Bitrix.</p>

      <Suspense
        fallback={
          <div className="flex flex-col gap-4">
            <BitrixDealCardSkeleton />
            <BitrixDealCardSkeleton />
            <BitrixDealCardSkeleton />
          </div>
        }
      ></Suspense>
    </section>
  );
};

export default PublishedDealsPage;
