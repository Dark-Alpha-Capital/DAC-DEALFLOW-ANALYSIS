
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SearchableEntityPicker } from "@/components/linking/SearchableEntityPicker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useRouter } from "@/lib/navigation-shim";
import type { Company, InvestorCompanyLink } from "@repo/db";
import { FieldGroup } from "@/components/ui/field";

export type InvestorCompanyLinkRow = {
  link: InvestorCompanyLink;
  company: Company;
};

export function AddInvestorCompanyLinkForm({
  investorId,
  excludeCompanyIds,
  onSaved,
}: {
  investorId: string;
  excludeCompanyIds: string[];
  onSaved?: () => void;
}) {
  const trpc = useTRPC();
  const router = useRouter();
  const [companyId, setCompanyId] = useState("");
  const [companyLabel, setCompanyLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "ARCHIVED">("ACTIVE");

  const { mutate: addLink, isPending } = useMutation(
    trpc.investors.addInvestorCompanyLink.mutationOptions({
      onSuccess: () => {
        toast.success("Company linked");
        setCompanyId("");
        setCompanyLabel("");
        setNotes("");
        setStatus("ACTIVE");
        void router.invalidate();
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
        variant="company"
        id="investor-company-add"
        label="Company"
        placeholder="Search companies by name…"
        selectedId={companyId}
        selectedLabel={companyLabel}
        excludeIds={excludeCompanyIds}
        onSelect={({ id, label }) => {
          setCompanyId(id);
          setCompanyLabel(label);
        }}
        onClear={() => {
          setCompanyId("");
          setCompanyLabel("");
        }}
      />
      <div className="space-y-2">
        <Label htmlFor="investor-company-add-notes">Notes</Label>
        <Textarea
          id="investor-company-add-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Context for this link (optional)"
          rows={3}
          disabled={!companyId}
        />
      </div>
      <div className="space-y-2">
        <Label>Link status</Label>
        <Select
          value={status}
          onValueChange={(v) => setStatus(v as "ACTIVE" | "ARCHIVED")}
          disabled={!companyId}
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
        disabled={isPending || !companyId}
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

export function EditInvestorCompanyLinkForm({
  linkId,
  companyName,
  initialNotes,
  initialStatus,
  onSaved,
}: {
  linkId: string;
  companyName: string;
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
        void router.invalidate();
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
        <Label>Company</Label>
        <p className="text-sm font-medium">{companyName}</p>
        <p className="text-muted-foreground text-xs">
          To change the company, remove this link and add a new one.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="investor-company-edit-notes">Notes</Label>
        <Textarea
          id="investor-company-edit-notes"
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
