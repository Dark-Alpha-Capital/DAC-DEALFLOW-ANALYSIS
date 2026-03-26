"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { UserRound, ExternalLink, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
import { FieldGroup } from "@/components/ui/field";
import { SearchableEntityPicker } from "@/components/linking/SearchableEntityPicker";
import { useTRPC } from "@/trpc/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { Investor, InvestorCompanyLink } from "@repo/db";

export type CompanyLinkedInvestorRow = {
  link: InvestorCompanyLink;
  investor: Investor;
};

function AddInvestorLinkForm({
  companyId,
  excludeInvestorIds,
  onSaved,
}: {
  companyId: string;
  excludeInvestorIds: string[];
  onSaved?: () => void;
}) {
  const trpc = useTRPC();
  const router = useRouter();
  const [investorId, setInvestorId] = useState("");
  const [investorLabel, setInvestorLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "ARCHIVED">("ACTIVE");

  const { mutate: addLink, isPending } = useMutation(
    trpc.investors.addInvestorCompanyLink.mutationOptions({
      onSuccess: () => {
        toast.success("Investor linked");
        setInvestorId("");
        setInvestorLabel("");
        setNotes("");
        setStatus("ACTIVE");
        router.refresh();
        onSaved?.();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to add link");
      },
    }),
  );

  return (
    <FieldGroup className="grid max-w-xl grid-cols-1 gap-4">
      <SearchableEntityPicker
        variant="investor"
        id="company-investor-add"
        label="Investor"
        placeholder="Search investors by name or email…"
        selectedId={investorId}
        selectedLabel={investorLabel}
        excludeIds={excludeInvestorIds}
        onSelect={({ id, label }) => {
          setInvestorId(id);
          setInvestorLabel(label);
        }}
        onClear={() => {
          setInvestorId("");
          setInvestorLabel("");
        }}
      />
      <div className="space-y-2">
        <Label htmlFor="company-investor-add-notes">Notes</Label>
        <Textarea
          id="company-investor-add-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Context for this link (optional)"
          rows={3}
          disabled={!investorId}
        />
      </div>
      <div className="space-y-2">
        <Label>Link status</Label>
        <Select
          value={status}
          onValueChange={(v) => setStatus(v as "ACTIVE" | "ARCHIVED")}
          disabled={!investorId}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="ARCHIVED">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button
        type="button"
        disabled={isPending || !investorId}
        onClick={() =>
          addLink({
            investorId,
            companyId,
            notes: notes.trim() ? notes : undefined,
            status,
          })
        }
      >
        {isPending ? "Saving…" : "Add link"}
      </Button>
    </FieldGroup>
  );
}

function EditInvestorLinkForm({
  linkId,
  investorName,
  initialNotes,
  initialStatus,
  onSaved,
}: {
  linkId: string;
  investorName: string;
  initialNotes: string | null;
  initialStatus: "ACTIVE" | "ARCHIVED";
  onSaved?: () => void;
}) {
  const trpc = useTRPC();
  const router = useRouter();
  const [notes, setNotes] = useState(() => initialNotes ?? "");
  const [status, setStatus] = useState<"ACTIVE" | "ARCHIVED">(initialStatus);

  useEffect(() => {
    setNotes(initialNotes ?? "");
    setStatus(initialStatus);
  }, [linkId, initialNotes, initialStatus]);

  const { mutate: updateLink, isPending } = useMutation(
    trpc.investors.updateInvestorCompanyLink.mutationOptions({
      onSuccess: () => {
        toast.success("Link updated");
        router.refresh();
        onSaved?.();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update link");
      },
    }),
  );

  return (
    <FieldGroup className="grid max-w-xl grid-cols-1 gap-4">
      <div className="space-y-1">
        <Label>Investor</Label>
        <p className="text-sm font-medium">{investorName}</p>
        <p className="text-muted-foreground text-xs">
          To change the investor, remove this link and add a new one.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="company-investor-edit-notes">Notes</Label>
        <Textarea
          id="company-investor-edit-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Context for this link (optional)"
          rows={3}
        />
      </div>
      <div className="space-y-2">
        <Label>Link status</Label>
        <Select
          value={status}
          onValueChange={(v) => setStatus(v as "ACTIVE" | "ARCHIVED")}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="ARCHIVED">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button
        type="button"
        disabled={isPending}
        onClick={() =>
          updateLink({
            linkId,
            notes,
            status,
          })
        }
      >
        {isPending ? "Saving…" : "Save changes"}
      </Button>
    </FieldGroup>
  );
}

export function CompanyLinkedInvestors({
  companyId,
  linkedInvestors,
}: {
  companyId: string;
  linkedInvestors: CompanyLinkedInvestorRow[];
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [editRow, setEditRow] = useState<CompanyLinkedInvestorRow | null>(null);
  const [removeRow, setRemoveRow] = useState<CompanyLinkedInvestorRow | null>(
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

  const excludeIds = linkedInvestors.map((r) => r.investor.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          Investors linked to this company (representation, sourcing context, etc.).
        </p>
        <Button type="button" className="gap-2" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" />
          Link an investor
        </Button>
      </div>

      {linkedInvestors.length === 0 ? (
        <p className="text-muted-foreground text-sm">No investors linked yet.</p>
      ) : (
        <div className="space-y-4">
          {linkedInvestors.map((row) => (
            <div
              key={row.link.id}
              className="bg-card rounded-xl border p-6 shadow-sm"
            >
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1 space-y-4">
                  <div className="flex items-start gap-3">
                    <UserRound className="text-muted-foreground mt-0.5 h-5 w-5 shrink-0" />
                    <div className="min-w-0 space-y-1">
                      <h2 className="text-xl font-semibold tracking-tight">
                        {row.investor.name}
                      </h2>
                      {row.investor.email ? (
                        <p className="text-muted-foreground text-sm">
                          {row.investor.email}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="bg-muted text-muted-foreground inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium">
                      {row.link.status === "ARCHIVED"
                        ? "Archived link"
                        : "Active link"}
                    </span>
                  </div>
                  {row.link.notes ? (
                    <div className="border-border border-t pt-4">
                      <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                        Link notes
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm">
                        {row.link.notes}
                      </p>
                    </div>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                  <Button asChild variant="default">
                    <Link
                      href={`/investors/${row.investor.id}`}
                      className="inline-flex gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View investor
                    </Link>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2"
                    onClick={() => setEditRow(row)}
                  >
                    <Pencil className="h-4 w-4" />
                    Edit link
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2 text-destructive hover:text-destructive"
                    onClick={() => setRemoveRow(row)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-h-[min(90vh,640px)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Link an investor</DialogTitle>
            <DialogDescription>
              Select an investor and optionally add notes.
            </DialogDescription>
          </DialogHeader>
          <AddInvestorLinkForm
            companyId={companyId}
            excludeInvestorIds={excludeIds}
            onSaved={() => setAddOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editRow} onOpenChange={(o) => !o && setEditRow(null)}>
        <DialogContent className="max-h-[min(90vh,640px)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit investor link</DialogTitle>
            <DialogDescription>Update notes or status.</DialogDescription>
          </DialogHeader>
          {editRow ? (
            <EditInvestorLinkForm
              key={editRow.link.id}
              linkId={editRow.link.id}
              investorName={editRow.investor.name}
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
                ? `Unlink ${removeRow.investor.name} from this company.`
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
