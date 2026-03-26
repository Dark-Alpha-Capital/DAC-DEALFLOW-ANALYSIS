"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
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
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { Company, InvestorCompanyLink } from "@repo/db";
import { FieldGroup } from "@/components/ui/field";

const NO_COMPANY = "__none__";

export type InvestorCompanyLinkInitial = {
  link: InvestorCompanyLink;
  company: Company;
} | null;

export function InvestorCompanyLinkForm({
  investorId,
  initial,
  onSaved,
}: {
  investorId: string;
  initial: InvestorCompanyLinkInitial;
  onSaved?: () => void;
}) {
  const trpc = useTRPC();
  const router = useRouter();
  const { data: companies = [] } = useQuery(
    trpc.companies.listForSelect.queryOptions(),
  );

  const mergedCompanies = useMemo(() => {
    const map = new Map(companies.map((c) => [c.id, c]));
    if (initial?.company && !map.has(initial.company.id)) {
      map.set(initial.company.id, {
        id: initial.company.id,
        name: initial.company.name,
      });
    }
    return [...map.values()].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );
  }, [companies, initial]);

  const [companyId, setCompanyId] = useState<string>(
    () => initial?.company.id ?? "",
  );
  const [notes, setNotes] = useState(() => initial?.link?.notes ?? "");
  const [status, setStatus] = useState<"ACTIVE" | "ARCHIVED">(
    () => (initial?.link?.status as "ACTIVE" | "ARCHIVED") ?? "ACTIVE",
  );

  useEffect(() => {
    setCompanyId(initial?.company.id ?? "");
    setNotes(initial?.link?.notes ?? "");
    setStatus((initial?.link?.status as "ACTIVE" | "ARCHIVED") ?? "ACTIVE");
  }, [initial?.company?.id, initial?.link?.notes, initial?.link?.status]);

  const { mutate: setCompanyLink, isPending } = useMutation(
    trpc.investors.setCompanyLink.mutationOptions({
      onSuccess: () => {
        toast.success("Company link updated");
        router.refresh();
        onSaved?.();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update company link");
      },
    }),
  );

  const selectValue = companyId || NO_COMPANY;

  return (
    <FieldGroup className="grid max-w-xl grid-cols-1 gap-4">
      <div className="space-y-2">
        <Label htmlFor="investor-company">Company</Label>
        <Select
          value={selectValue}
          onValueChange={(v) => setCompanyId(v === NO_COMPANY ? "" : v)}
          disabled={mergedCompanies.length === 0}
        >
          <SelectTrigger id="investor-company">
            <SelectValue
              placeholder={
                mergedCompanies.length === 0
                  ? "Add a company first"
                  : "Select company"
              }
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_COMPANY}>No company</SelectItem>
            {mergedCompanies.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="investor-company-notes">Notes</Label>
        <Textarea
          id="investor-company-notes"
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
      <div className="flex flex-wrap gap-2 pt-1">
        <Button
          type="button"
          disabled={isPending}
          onClick={() =>
            setCompanyLink({
              investorId,
              companyId: companyId || null,
              notes: notes.trim() ? notes : undefined,
              status,
            })
          }
        >
          {isPending ? "Saving…" : "Save link"}
        </Button>
        {initial ? (
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() =>
              setCompanyLink({
                investorId,
                companyId: null,
              })
            }
          >
            Remove link
          </Button>
        ) : null}
      </div>
    </FieldGroup>
  );
}
