"use client";

import { FieldLegend, FieldSet } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AddInvestorCompanyLinkForm,
  EditInvestorCompanyLinkForm,
  type InvestorCompanyLinkRow,
} from "@/components/investors/InvestorCompanyLinkForm";
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
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Building2, ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";

export function InvestorCompanyLinkSection({
  investorId,
  links,
  className,
}: {
  investorId: string;
  links: InvestorCompanyLinkRow[];
  /** e.g. mt-0 when embedded in a tab (default keeps spacing for edit page). */
  className?: string;
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
    <FieldSet className={cn("mt-10", className)}>
      <FieldLegend>Linked companies</FieldLegend>
      <p className="text-muted-foreground mb-4 text-sm">
        Tie this investor to companies they represent or where you sourced them.
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        <Button type="button" size="sm" className="gap-2" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" />
          Link a company
        </Button>
      </div>

      {links.length === 0 ? (
        <p className="text-muted-foreground text-sm">No companies linked yet.</p>
      ) : (
        <ul className="space-y-3">
          {links.map((row) => (
            <li
              key={row.link.id}
              className="border-border flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
            >
              <div className="flex min-w-0 items-start gap-2">
                <Building2 className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                <div className="min-w-0">
                  <p className="truncate font-medium">{row.company.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {row.link.status === "ARCHIVED" ? "Archived" : "Active"}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/companies/${row.company.id}`} className="gap-1">
                    <ExternalLink className="h-3.5 w-3.5" />
                    View
                  </Link>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => setEditRow(row)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1 text-destructive"
                  onClick={() => setRemoveRow(row)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-h-[min(90vh,640px)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Link a company</DialogTitle>
            <DialogDescription>
              Select a company and optionally add notes.
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
            <DialogDescription>Update notes or status.</DialogDescription>
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
                ? `Unlink ${removeRow.company.name} from this investor.`
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
    </FieldSet>
  );
}
