
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "@/lib/navigation-shim";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { useTRPC } from "@/trpc/client";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const STATUS_OPTIONS = [
  { value: "NEW", label: "New" },
  { value: "PROCESSED", label: "Processed" },
  { value: "DUPLICATE", label: "Duplicate" },
  { value: "REJECTED", label: "Rejected" },
] as const;

type CompanyPreview = { id: string; name: string };

interface LeadStatusControlProps {
  leadId: string;
  leadStatus: string;
  hasConvertedCompany: boolean;
  duplicateCompany: CompanyPreview | null;
}

export default function LeadStatusControl({
  leadId,
  leadStatus,
  hasConvertedCompany,
  duplicateCompany,
}: LeadStatusControlProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState(
    duplicateCompany?.id ?? "",
  );

  const isSearchMode = searchQuery.trim().length >= 2;

  const suggestionsQuery = useQuery({
    ...trpc.leads.duplicateCandidates.queryOptions({ leadId, limit: 8 }),
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

  const { mutate: updateStatus, isPending: updatingStatus } = useMutation(
    trpc.leads.updateStatus.mutationOptions({
      onSuccess: () => {
        toast.success("Status updated");
        setDuplicateDialogOpen(false);
        setSearchQuery("");
        void router.invalidate();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update status");
      },
    }),
  );

  function handleStatusChange(newStatus: string) {
    if (newStatus === "DUPLICATE") {
      if (duplicateCompany) {
        updateStatus({ leadId, status: "DUPLICATE", companyId: duplicateCompany.id });
      } else {
        setSelectedCompanyId("");
        setDuplicateDialogOpen(true);
      }
      return;
    }
    updateStatus({ leadId, status: newStatus as "NEW" | "PROCESSED" | "REJECTED" });
  }

  function confirmDuplicate() {
    if (!selectedCompanyId) {
      toast.error("Select a company first");
      return;
    }
    updateStatus({
      leadId,
      status: "DUPLICATE",
      companyId: selectedCompanyId,
    });
  }

  return (
    <>
      <div className="space-y-2">
        <label className="text-muted-foreground text-sm font-medium">
          Status
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={leadStatus}
            onValueChange={handleStatusChange}
            disabled={updatingStatus}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasConvertedCompany && (
            <span className="text-muted-foreground text-xs">
              Converted to company
            </span>
          )}
        </div>
        {duplicateCompany && (
          <p className="text-muted-foreground text-xs">
            Duplicate linked to{" "}
            <Link
              href={`/companies/${duplicateCompany.id}`}
              className="underline"
            >
              {duplicateCompany.name}
            </Link>
          </p>
        )}
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
            <DialogTitle>Set status to Duplicate</DialogTitle>
            <DialogDescription>
              Select the existing company this lead duplicates.
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

            {candidateRows.length === 0 && (
              <p className="text-muted-foreground text-xs">
                No candidates found. Try a broader search term.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDuplicateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={confirmDuplicate}
              disabled={!selectedCompanyId || updatingStatus}
            >
              {updatingStatus ? "Saving..." : "Set Duplicate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
