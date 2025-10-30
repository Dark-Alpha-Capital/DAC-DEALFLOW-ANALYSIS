"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import DeleteRollupButton from "@/components/Buttons/delete-rollup-button";
import { Deal, User, Rollup } from "@prisma/client";

type RollupWithRelations = Rollup & {
  deals: Deal[];
  users: Pick<User, "id" | "name" | "email" | "role">[];
};

interface RollupCardProps {
  rollup: RollupWithRelations;
  currentUserRole?: string;
}

export default function RollupCard({
  rollup,
  currentUserRole,
}: RollupCardProps) {
  return (
    <div className="rounded-md border bg-background p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xl font-semibold">{rollup.name}</h2>
        <span className="text-sm text-muted-foreground">
          {new Date(rollup.createdAt).toLocaleDateString()}
        </span>
      </div>

      {rollup.description && (
        <p className="mb-2 text-sm text-muted-foreground">
          {rollup.description}
        </p>
      )}

      <div className="mb-2">
        <strong>Deals in this rollup:</strong>
        <ul className="ml-4 mt-1 list-disc text-sm text-muted-foreground">
          {rollup.deals.map((deal) => (
            <li key={deal.id} className="mb-1">
              <div className="font-semibold">
                {deal.title || deal.dealCaption}
              </div>
              <div className="text-sm text-muted-foreground">
                Brokerage: {deal.brokerage} | Revenue: $
                {deal.revenue.toLocaleString()} | EBITDA: $
                {deal.ebitda.toLocaleString()} | Industry: {deal.industry}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="mb-2 flex gap-2 text-sm text-muted-foreground">
        <strong>Saved by:</strong>{" "}
        {rollup.users.map((user) => user.name || user.email).join(", ")}
      </div>

      <div className="flex gap-2">
        <DeleteRollupButton rollupId={rollup.id} userRole={currentUserRole} />

        <Button size="sm" variant="outline" asChild>
          <Link href={`/rollups/${rollup.id}`}>View Details</Link>
        </Button>
      </div>
    </div>
  );
}
