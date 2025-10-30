import React, { Suspense } from "react";
import { listAndMapMyDeals } from "@/lib/queries";
import BitrixDealCard from "@/components/bitrix-deal-card";
import AIReasoningSkeleton from "@/components/skeletons/AIReasoningSkeleton";
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
      >
        <FetchBitrixDeals />
      </Suspense>
    </section>
  );
};

export default PublishedDealsPage;

async function FetchBitrixDeals() {
  const deals = await listAndMapMyDeals();

  if (!deals || "error" in deals) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <h3 className="mb-2 text-xl font-medium">No deals found</h3>
        <p className="text-muted-foreground">
          There are no published deals available at this time.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 grid grid-cols-1 gap-6 md:mt-6 md:grid-cols-2 lg:mt-8 lg:grid-cols-3">
      {deals.map((deal) => (
        <BitrixDealCard key={deal.id} deal={deal} />
      ))}
    </div>
  );
}
