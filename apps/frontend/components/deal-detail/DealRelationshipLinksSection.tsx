import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Building2, ExternalLink, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FieldSet, FieldLegend } from "@/components/ui/field";
import { useTRPC } from "@/trpc/client";
import { useRouter } from "@/lib/navigation-shim";
import { SearchableEntityPicker } from "@/components/linking/SearchableEntityPicker";

export function DealRelationshipLinksSection({
  dealOpportunityId,
}: {
  dealOpportunityId: string;
}) {
  const trpc = useTRPC();
  const router = useRouter();

  const companyLinksQuery = useQuery(
    trpc.dealOpportunities.listCompanyLinks.queryOptions({ dealOpportunityId }),
  );
  const investorLinksQuery = useQuery(
    trpc.dealOpportunities.listInvestorLinks.queryOptions({ dealOpportunityId }),
  );

  const companyLinks = companyLinksQuery.data ?? [];
  const investorLinks = investorLinksQuery.data ?? [];

  const [companyId, setCompanyId] = useState("");
  const [companyLabel, setCompanyLabel] = useState("");
  const [companyNotes, setCompanyNotes] = useState("");

  const [investorId, setInvestorId] = useState("");
  const [investorLabel, setInvestorLabel] = useState("");
  const [investorNotes, setInvestorNotes] = useState("");

  const { mutate: addCompanyLink, isPending: addingCompany } = useMutation(
    trpc.dealOpportunities.addCompanyLink.mutationOptions({
      onSuccess: () => {
        toast.success("Company linked to deal");
        setCompanyId("");
        setCompanyLabel("");
        setCompanyNotes("");
        void router.invalidate();
      },
      onError: (error) => toast.error(error.message || "Failed to link company"),
    }),
  );
  const { mutate: removeCompanyLink, isPending: removingCompany } = useMutation(
    trpc.dealOpportunities.removeCompanyLink.mutationOptions({
      onSuccess: () => {
        toast.success("Company link removed");
        void router.invalidate();
      },
      onError: (error) => toast.error(error.message || "Failed to remove company link"),
    }),
  );

  const { mutate: addInvestorLink, isPending: addingInvestor } = useMutation(
    trpc.dealOpportunities.addInvestorLink.mutationOptions({
      onSuccess: () => {
        toast.success("Investor linked to deal");
        setInvestorId("");
        setInvestorLabel("");
        setInvestorNotes("");
        void router.invalidate();
      },
      onError: (error) => toast.error(error.message || "Failed to link investor"),
    }),
  );
  const { mutate: removeInvestorLink, isPending: removingInvestor } = useMutation(
    trpc.dealOpportunities.removeInvestorLink.mutationOptions({
      onSuccess: () => {
        toast.success("Investor link removed");
        void router.invalidate();
      },
      onError: (error) => toast.error(error.message || "Failed to remove investor link"),
    }),
  );

  return (
    <FieldSet>
      <FieldLegend>Relationship links</FieldLegend>
      <p className="text-muted-foreground mb-4 text-sm">
        Attach multiple companies and investors to this deal opportunity.
      </p>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Linked companies</h3>
          <SearchableEntityPicker
            variant="company"
            label="Add company"
            placeholder="Search companies…"
            selectedId={companyId}
            selectedLabel={companyLabel}
            excludeIds={companyLinks.map((r) => r.company.id)}
            onSelect={({ id, label }) => {
              setCompanyId(id);
              setCompanyLabel(label);
            }}
            onClear={() => {
              setCompanyId("");
              setCompanyLabel("");
            }}
            id="deal-company-link-picker"
          />
          <div className="space-y-2">
            <Label htmlFor="deal-company-link-notes">Notes (optional)</Label>
            <Textarea
              id="deal-company-link-notes"
              rows={2}
              value={companyNotes}
              onChange={(e) => setCompanyNotes(e.target.value)}
              placeholder="Context for this company link"
              disabled={!companyId}
            />
          </div>
          <Button
            type="button"
            disabled={!companyId || addingCompany}
            onClick={() =>
              addCompanyLink({
                dealOpportunityId,
                companyId,
                notes: companyNotes.trim() || undefined,
              })
            }
          >
            {addingCompany ? "Linking..." : "Link company"}
          </Button>

          <ul className="space-y-2">
            {companyLinks.map((row) => (
              <li
                key={row.link.id}
                className="border-border flex items-center justify-between gap-2 rounded-md border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{row.company.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {[row.company.industry, row.company.location]
                      .filter(Boolean)
                      .join(" · ") || "Company link"}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button asChild size="icon" variant="ghost">
                    <Link to={`/companies/${row.company.id}`} aria-label="Open company">
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeCompanyLink({ linkId: row.link.id })}
                    disabled={removingCompany}
                    aria-label="Remove company link"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-medium">Linked investors</h3>
          <SearchableEntityPicker
            variant="investor"
            label="Add investor"
            placeholder="Search investors…"
            selectedId={investorId}
            selectedLabel={investorLabel}
            excludeIds={investorLinks.map((r) => r.investor.id)}
            onSelect={({ id, label }) => {
              setInvestorId(id);
              setInvestorLabel(label);
            }}
            onClear={() => {
              setInvestorId("");
              setInvestorLabel("");
            }}
            id="deal-investor-link-picker"
          />
          <div className="space-y-2">
            <Label htmlFor="deal-investor-link-notes">Notes (optional)</Label>
            <Textarea
              id="deal-investor-link-notes"
              rows={2}
              value={investorNotes}
              onChange={(e) => setInvestorNotes(e.target.value)}
              placeholder="Context for this investor link"
              disabled={!investorId}
            />
          </div>
          <Button
            type="button"
            disabled={!investorId || addingInvestor}
            onClick={() =>
              addInvestorLink({
                dealOpportunityId,
                investorId,
                notes: investorNotes.trim() || undefined,
              })
            }
          >
            {addingInvestor ? "Linking..." : "Link investor"}
          </Button>

          <ul className="space-y-2">
            {investorLinks.map((row) => (
              <li
                key={row.link.id}
                className="border-border flex items-center justify-between gap-2 rounded-md border px-3 py-2"
              >
                <div className="min-w-0 flex items-center gap-2">
                  <UserPlus className="text-muted-foreground h-4 w-4 shrink-0" />
                  <div>
                    <p className="truncate text-sm font-medium">{row.investor.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {[row.investor.type, row.investor.status].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button asChild size="icon" variant="ghost">
                    <Link to={`/investors/${row.investor.id}`} aria-label="Open investor">
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeInvestorLink({ linkId: row.link.id })}
                    disabled={removingInvestor}
                    aria-label="Remove investor link"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </FieldSet>
  );
}
