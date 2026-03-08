"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DeleteEntityDialog from "@/components/DeleteEntityDialog";

type CompanyPreview = {
  id: string;
  name: string;
};

interface LeadResolutionActionsProps {
  leadId: string;
  leadStatus: string;
  hasConvertedCompany: boolean;
  duplicateCompany: CompanyPreview | null;
}

export default function LeadResolutionActions({
  leadId,
  leadStatus,
  hasConvertedCompany,
  duplicateCompany,
}: LeadResolutionActionsProps) {
  const router = useRouter();
  const trpc = useTRPC();

  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState(
    duplicateCompany?.id ?? "",
  );

  const isSearchMode = searchQuery.trim().length >= 2;

  const suggestionsQuery = useQuery({
    ...trpc.leads.duplicateCandidates.queryOptions({
      leadId,
      limit: 8,
    }),
    enabled: duplicateDialogOpen && !isSearchMode,
  });

  const searchResultsQuery = useQuery({
    ...trpc.leads.duplicateCandidates.queryOptions({
      leadId,
      query: searchQuery.trim(),
      limit: 20,
    }),
    enabled: duplicateDialogOpen && isSearchMode,
  });

  const candidateRows = useMemo(
    () => (isSearchMode ? searchResultsQuery.data : suggestionsQuery.data) ?? [],
    [isSearchMode, searchResultsQuery.data, suggestionsQuery.data],
  );

  const { mutate: markDuplicate, isPending: markingDuplicate } = useMutation(
    trpc.leads.markDuplicate.mutationOptions({
      onSuccess: () => {
        toast.success("Lead marked as duplicate");
        setDuplicateDialogOpen(false);
        setSearchQuery("");
        router.refresh();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to mark duplicate");
      },
    }),
  );

  const { mutate: clearDuplicate, isPending: clearingDuplicate } = useMutation(
    trpc.leads.clearDuplicate.mutationOptions({
      onSuccess: () => {
        toast.success("Duplicate link cleared");
        router.refresh();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to clear duplicate");
      },
    }),
  );

  const { mutate: rejectLead, isPending: rejectingLead } = useMutation(
    trpc.leads.reject.mutationOptions({
      onSuccess: () => {
        toast.success("Lead rejected");
        setRejectDialogOpen(false);
        router.refresh();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to reject lead");
      },
    }),
  );

  const isDuplicateFlowBusy = markingDuplicate || clearingDuplicate;
  const isRejectDisabled = hasConvertedCompany || rejectingLead;
  const isDuplicateDisabled = hasConvertedCompany || isDuplicateFlowBusy;
  const hasDuplicate = !!duplicateCompany;

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setDuplicateDialogOpen(true)}
          disabled={isDuplicateDisabled}
        >
          {hasDuplicate ? "Change duplicate" : "Mark duplicate"}
        </Button>

        {hasDuplicate && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => clearDuplicate({ leadId })}
            disabled={isDuplicateDisabled}
          >
            Clear duplicate
          </Button>
        )}

        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={() => setRejectDialogOpen(true)}
          disabled={isRejectDisabled}
          title={hasConvertedCompany ? "Converted leads cannot be rejected." : undefined}
        >
          Reject lead
        </Button>
      </div>

      <Dialog
        open={duplicateDialogOpen}
        onOpenChange={(open) => {
          setDuplicateDialogOpen(open);
          if (!open) {
            setSearchQuery("");
            setSelectedCompanyId(duplicateCompany?.id ?? "");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Lead as Duplicate</DialogTitle>
            <DialogDescription>
              Link this lead to an existing company without creating a new company record.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Input
              placeholder="Search companies (min 2 characters)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a company" />
              </SelectTrigger>
              <SelectContent>
                {candidateRows.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {candidateRows.length > 0 && (
              <div className="space-y-2">
                <p className="text-muted-foreground text-xs">
                  {isSearchMode ? "Search results" : "Suggested matches"}
                </p>
                <ul className="space-y-1 text-xs">
                  {candidateRows.map((company) => (
                    <li key={company.id} className="text-muted-foreground">
                      {company.name}
                      {company.location ? ` • ${company.location}` : ""}
                      {typeof company.score === "number"
                        ? ` • score ${company.score.toFixed(2)}`
                        : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {candidateRows.length === 0 && (
              <p className="text-muted-foreground text-xs">
                No candidates found. Try a broader search term.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              onClick={() => {
                if (!selectedCompanyId) {
                  toast.error("Select a company first");
                  return;
                }
                markDuplicate({ leadId, companyId: selectedCompanyId });
              }}
              disabled={!selectedCompanyId || markingDuplicate}
            >
              {markingDuplicate ? "Saving..." : "Mark Duplicate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteEntityDialog
        open={rejectDialogOpen}
        onOpenChange={setRejectDialogOpen}
        title="Reject this lead?"
        description="This marks the lead as REJECTED and removes any duplicate link."
        confirmLabel="Reject"
        isPending={rejectingLead}
        onConfirm={() => rejectLead({ id: leadId })}
      />

      {hasDuplicate && (
        <p className="text-muted-foreground text-xs">
          Duplicate linked to{" "}
          <Link href={`/companies/${duplicateCompany.id}`} className="underline">
            {duplicateCompany.name}
          </Link>
          {leadStatus !== "DUPLICATE" ? " (status can be updated)" : ""}.
        </p>
      )}
    </>
  );
}
