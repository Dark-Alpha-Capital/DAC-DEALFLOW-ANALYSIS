"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2, ExternalLink, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  InvestorCompanyLinkForm,
  type InvestorCompanyLinkInitial,
} from "@/components/investors/InvestorCompanyLinkForm";

export function InvestorCompanyLinkTab({
  investorId,
  initial,
}: {
  investorId: string;
  initial: InvestorCompanyLinkInitial;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);

  if (!initial) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground text-sm">
          No company linked yet. Tie this investor to a company you sourced them
          from (one company per investor).
        </p>
        <Button type="button" onClick={() => setDialogOpen(true)}>
          Link a company
        </Button>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-h-[min(90vh,640px)] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Link a company</DialogTitle>
              <DialogDescription>
                Select a company and optionally add notes or archive the link
                later.
              </DialogDescription>
            </DialogHeader>
            <InvestorCompanyLinkForm
              investorId={investorId}
              initial={null}
              onSaved={() => setDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  const { company, link } = initial;

  return (
    <>
      <div className="space-y-6">
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
                    <p className="text-muted-foreground text-sm">
                      {company.industry}
                    </p>
                  ) : null}
                  {company.location ? (
                    <p className="text-muted-foreground text-sm">
                      {company.location}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="bg-muted text-muted-foreground inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium">
                  {link.status === "ARCHIVED"
                    ? "Archived link"
                    : "Active link"}
                </span>
              </div>
              {link.notes ? (
                <div className="border-border border-t pt-4">
                  <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                    Link notes
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm">
                    {link.notes}
                  </p>
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
                onClick={() => setDialogOpen(true)}
              >
                <Pencil className="h-4 w-4" />
                Edit link
              </Button>
            </div>
          </div>
        </div>
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[min(90vh,640px)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit company link</DialogTitle>
            <DialogDescription>
              Change the linked company, notes, or archive this link.
            </DialogDescription>
          </DialogHeader>
          <InvestorCompanyLinkForm
            investorId={investorId}
            initial={initial}
            onSaved={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
