import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@/lib/navigation-shim";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useTRPC } from "@/trpc/client";
import { formatDateStable } from "@/lib/utils";

export type OutreachRow = {
  id: string;
  dealOpportunityId: string | null;
  companyId: string | null;
  type: string;
  notes: string | null;
  outcome: string | null;
  createdById: string | null;
  createdAt: Date;
  createdByName: string | null;
};

interface CompanyOutreachProps {
  outreach: OutreachRow[];
  companyId?: string;
  /** When set (e.g. deal detail without a company), outreach can be logged for this deal only. */
  defaultDealOpportunityId?: string;
  dealOpportunities?: Array<{
    id: string;
    stage: string;
    createdAt: Date;
  }>;
}

const outreachTypes = ["EMAIL", "CALL", "LINKEDIN", "MEETING"] as const;

export function CompanyOutreach({
  outreach,
  companyId,
  defaultDealOpportunityId,
  dealOpportunities = [],
}: CompanyOutreachProps) {
  const trpc = useTRPC();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<(typeof outreachTypes)[number]>("EMAIL");
  const [dealOpportunityId, setDealOpportunityId] = useState("none");
  const [outcome, setOutcome] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (defaultDealOpportunityId && !companyId) {
      setDealOpportunityId(defaultDealOpportunityId);
    }
  }, [defaultDealOpportunityId, companyId]);

  const { mutate: createOutreach, isPending } = useMutation(
    trpc.outreach.create.mutationOptions({
      onSuccess: () => {
        toast.success("Outreach added");
        setOpen(false);
        setType("EMAIL");
        setDealOpportunityId("none");
        setOutcome("");
        setNotes("");
        void router.invalidate();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to add outreach");
      },
    }),
  );

  const canAddOutreach = Boolean(companyId) || Boolean(defaultDealOpportunityId);

  const handleSave = () => {
    const selectedDeal =
      dealOpportunityId !== "none"
        ? dealOpportunityId
        : defaultDealOpportunityId;
    if (!companyId && !selectedDeal) {
      toast.error("Select a deal opportunity or add outreach from a company.");
      return;
    }

    createOutreach({
      ...(companyId ? { companyId } : {}),
      ...(selectedDeal ? { dealOpportunityId: selectedDeal } : {}),
      type,
      outcome: outcome.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  };

  const outreachContent = (
    <div className="space-y-3">
      {outreach.map((row) => (
        <Card key={row.id} className="space-y-2 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-medium text-foreground">{row.type}</span>
            <span className="text-muted-foreground">
              {formatDateStable(row.createdAt)}
            </span>
          </div>
          {row.outcome && (
            <p className="text-muted-foreground text-xs">
              <span className="font-medium">Outcome:</span> {row.outcome}
            </p>
          )}
          {row.notes && (
            <p className="text-muted-foreground text-xs">{row.notes}</p>
          )}
          {row.createdByName && (
            <p className="text-muted-foreground text-xs">By {row.createdByName}</p>
          )}
        </Card>
      ))}
    </div>
  );

  if (outreach.length === 0) {
    return (
      <div className="border-border space-y-4 border-b pb-6">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-muted-foreground text-sm font-medium">
            Outreach history
          </h2>
          {canAddOutreach && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  Add outreach
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add outreach</DialogTitle>
                </DialogHeader>
                <div className="mt-2 space-y-3">
                  <div className="space-y-1">
                    <p className="text-xs font-medium">Type</p>
                    <Select
                      value={type}
                      onValueChange={(value) =>
                        setType(value as (typeof outreachTypes)[number])
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {outreachTypes.map((item) => (
                          <SelectItem key={item} value={item}>
                            {item}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-medium">
                      {companyId
                        ? "Deal opportunity (optional)"
                        : "Deal opportunity"}
                    </p>
                    <Select
                      value={dealOpportunityId}
                      onValueChange={setDealOpportunityId}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {companyId ? (
                          <SelectItem value="none">None</SelectItem>
                        ) : null}
                        {dealOpportunities.map((deal) => (
                          <SelectItem key={deal.id} value={deal.id}>
                            {deal.stage} - {formatDateStable(deal.createdAt)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-medium">Outcome (optional)</p>
                    <Input
                      value={outcome}
                      onChange={(event) => setOutcome(event.target.value)}
                      placeholder="e.g. Awaiting response"
                    />
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-medium">Notes (optional)</p>
                    <Textarea
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder="Additional context"
                      className="min-h-[110px]"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setOpen(false)}
                      disabled={isPending}
                    >
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={isPending}>
                      {isPending ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
        <p className="text-muted-foreground text-xs">
          No outreach recorded yet.
        </p>
      </div>
    );
  }

  return (
    <div className="border-border space-y-4 border-b pb-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-muted-foreground text-sm font-medium">
          Outreach history
        </h2>
        {canAddOutreach && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                Add outreach
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add outreach</DialogTitle>
              </DialogHeader>
              <div className="mt-2 space-y-3">
                <div className="space-y-1">
                  <p className="text-xs font-medium">Type</p>
                  <Select
                    value={type}
                    onValueChange={(value) =>
                      setType(value as (typeof outreachTypes)[number])
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {outreachTypes.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-medium">
                    {companyId
                      ? "Deal opportunity (optional)"
                      : "Deal opportunity"}
                  </p>
                  <Select
                    value={dealOpportunityId}
                    onValueChange={setDealOpportunityId}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {companyId ? (
                        <SelectItem value="none">None</SelectItem>
                      ) : null}
                      {dealOpportunities.map((deal) => (
                        <SelectItem key={deal.id} value={deal.id}>
                          {deal.stage} - {formatDateStable(deal.createdAt)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-medium">Outcome (optional)</p>
                  <Input
                    value={outcome}
                    onChange={(event) => setOutcome(event.target.value)}
                    placeholder="e.g. Awaiting response"
                  />
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-medium">Notes (optional)</p>
                  <Textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Additional context"
                    className="min-h-[110px]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setOpen(false)}
                    disabled={isPending}
                  >
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={isPending}>
                    {isPending ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
      {outreachContent}
    </div>
  );
}
