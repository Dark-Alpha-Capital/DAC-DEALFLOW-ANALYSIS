"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Rollup as RollupType, Deal as DealType } from "@prisma/client";
import { toast } from "sonner";
import { updateRollup, updateDealInRollup } from "@/app/actions/rollup-actions";

// --- Custom types ---
export type DealUpdatePayload = {
  id: string;
  chunk_text?: string | null;
  description?: string | null;
};

export type RollupUpdatePayload = {
  name?: string;
  description?: string | null;
  summary?: string | null;
  deals?: DealUpdatePayload[];
};

interface EditRollupDialogProps {
  rollup: RollupType & { deals?: DealType[] };
  onSave?: (updated: RollupUpdatePayload) => void; // kept for backward compatibility
}

export default function EditRollupDialog({
  rollup,
  onSave,
}: EditRollupDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(rollup.name);
  const [description, setDescription] = useState(rollup.description ?? "");
  const [summary, setSummary] = useState(rollup.summary ?? "");
  const [deals, setDeals] = useState<DealType[]>(rollup.deals ?? []);
  const [isPending, startTransition] = useTransition();

  const handleDealChange = (
    id: string,
    field: keyof Pick<DealType, "chunk_text" | "description">,
    value: string,
  ) => {
    setDeals((prev) =>
      prev.map((deal) => (deal.id === id ? { ...deal, [field]: value } : deal)),
    );
  };

  const handleSave = async () => {
    startTransition(async () => {
      try {
        // Update rollup
        const rollupResult = await updateRollup(rollup.id, {
          name,
          description,
          summary,
        });

        if (!rollupResult.success) {
          toast.error(rollupResult.error || "Failed to update rollup");
          return;
        }

        // Update deals if provided
        if (deals.length > 0) {
          for (const deal of deals) {
            await updateDealInRollup(deal.id, {
              chunk_text: deal.chunk_text ?? undefined,
              description: deal.description ?? undefined,
            });
          }
        }

        // Call onSave callback if provided (for backward compatibility)
        if (onSave) {
          const updatedDeals: DealUpdatePayload[] = deals.map((d) => ({
            id: d.id,
            chunk_text: d.chunk_text ?? null,
            description: d.description ?? null,
          }));

          onSave({
            name,
            description,
            summary,
            deals: updatedDeals.length ? updatedDeals : undefined,
          });
        }

        toast.success("Rollup updated!");
        setOpen(false);
      } catch (err) {
        console.error(err);
        toast.error("Failed to save rollup");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Edit</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Rollup</DialogTitle>
        </DialogHeader>

        <div className="mt-2 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Description
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Summary</label>
            <Textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="AI-generated summary or custom notes"
            />
          </div>

          {deals.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Deals</h2>
              {deals.map((deal) => (
                <div
                  key={deal.id}
                  className="space-y-2 rounded-md border bg-gray-50 p-3"
                >
                  <p className="font-medium">
                    {deal.title || deal.dealCaption}
                  </p>
                  <Textarea
                    value={deal.chunk_text ?? ""}
                    onChange={(e) =>
                      handleDealChange(deal.id, "chunk_text", e.target.value)
                    }
                    placeholder="Chunk text"
                  />
                  <Textarea
                    value={deal.description ?? ""}
                    onChange={(e) =>
                      handleDealChange(deal.id, "description", e.target.value)
                    }
                    placeholder="Description"
                  />
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
