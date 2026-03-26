"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { Building2, ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  AddInvestorCompanyLinkForm,
  EditInvestorCompanyLinkForm,
  type InvestorCompanyLinkRow,
} from "@/components/investors/InvestorCompanyLinkForm";
import { useTRPC } from "@/trpc/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

function LinkCard({
  row,
  onEdit,
  onRemoveClick,
}: {
  row: InvestorCompanyLinkRow;
  onEdit: () => void;
  onRemoveClick: () => void;
}) {
  const { company, link } = row;
  return (
    <div className="bg-card rounded-xl border p-6 shadow-sm">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex items-start gap-3">
            <Building2 className="text-muted-foreground mt-0.5 h-5 w-5 shrink-0" />
            <div className="min-w-0 space-y-1">
              <h2 className="text-xl font-semibold tracking-tight">
                {company.name}
              </h2>
              {company.industry ? (
                <p className="text-muted-foreground text-sm">{company.industry}</p>
              ) : null}
              {company.location ? (
                <p className="text-muted-foreground text-sm">{company.location}</p>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="bg-muted text-muted-foreground inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium">
              {link.status === "ARCHIVED" ? "Archived link" : "Active link"}
            </span>
          </div>
          {link.notes ? (
            <div className="border-border border-t pt-4">
              <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                Link notes
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{link.notes}</p>
            </div>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          <Button asChild variant="default">
            <Link
              href={`/companies/${company.id}`}
              className="inline-flex gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              View company
            </Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={onEdit}
          >
            <Pencil className="h-4 w-4" />
            Edit link
          </Button>
          <Button
            type="button"
            variant="outline"
            className="gap-2 text-destructive hover:text-destructive"
            onClick={onRemoveClick}
          >
            <Trash2 className="h-4 w-4" />
            Remove
          </Button>
        </div>
      </div>
    </div>
  );
}

export function InvestorCompanyLinkTab({
  investorId,
  links,
}: {
  investorId: string;
  links: InvestorCompanyLinkRow[];
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [editRow, setEditRow] = useState<InvestorCompanyLinkRow | null>(null);
  const [removeRow, setRemoveRow] = useState<InvestorCompanyLinkRow | null>(
    null,
  );
  const trpc = useTRPC();
  const router = useRouter();

  const { mutate: removeLink, isPending: removePending } = useMutation(
    trpc.investors.removeInvestorCompanyLink.mutationOptions({
      onSuccess: () => {
        toast.success("Link removed");
        setRemoveRow(null);
        router.refresh();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to remove link");
      },
    }),
  );

  const excludeIds = links.map((l) => l.company.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          Link this investor to one or more companies they represent or where you
          sourced them.
        </p>
        <Button type="button" className="gap-2" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" />
          Link a company
        </Button>
      </div>

      {links.length === 0 ? (
        <p className="text-muted-foreground text-sm">No companies linked yet.</p>
      ) : (
        <div className="space-y-4">
          {links.map((row) => (
            <LinkCard
              key={row.link.id}
              row={row}
              onEdit={() => setEditRow(row)}
              onRemoveClick={() => setRemoveRow(row)}
            />
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-h-[min(90vh,640px)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Link a company</DialogTitle>
            <DialogDescription>
              Select a company and optionally add notes or set status.
            </DialogDescription>
          </DialogHeader>
          <AddInvestorCompanyLinkForm
            investorId={investorId}
            excludeCompanyIds={excludeIds}
            onSaved={() => setAddOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editRow} onOpenChange={(o) => !o && setEditRow(null)}>
        <DialogContent className="max-h-[min(90vh,640px)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit company link</DialogTitle>
            <DialogDescription>
              Update notes or archive this link.
            </DialogDescription>
          </DialogHeader>
          {editRow ? (
            <EditInvestorCompanyLinkForm
              key={editRow.link.id}
              linkId={editRow.link.id}
              companyName={editRow.company.name}
              initialNotes={editRow.link.notes}
              initialStatus={
                editRow.link.status === "ARCHIVED" ? "ARCHIVED" : "ACTIVE"
              }
              onSaved={() => setEditRow(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!removeRow}
        onOpenChange={(o) => !o && setRemoveRow(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this link?</AlertDialogTitle>
            <AlertDialogDescription>
              {removeRow
                ? `Unlink ${removeRow.company.name} from this investor. This does not delete the company or investor.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={removePending}
              onClick={() => {
                if (removeRow) removeLink({ linkId: removeRow.link.id });
              }}
            >
              {removePending ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
