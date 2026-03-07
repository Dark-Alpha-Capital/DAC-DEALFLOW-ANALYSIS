"use client";

import type { Lead } from "@repo/db";
import type { DealOpportunityWithCompany } from "@repo/db/queries";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import DealOppCard from "@/components/DealOppCard";

function getStatusColor(status: string): string {
  switch (status) {
    case "NEW":
      return "bg-primary/10 text-primary";
    case "PROCESSED":
      return "bg-green-500/10 text-green-600 dark:text-green-400";
    case "DUPLICATE":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
    case "REJECTED":
      return "bg-destructive/10 text-destructive";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function Field({
  label,
  value,
  children,
}: {
  label: string;
  value?: string | null;
  children?: React.ReactNode;
}) {
  const content = children ?? (value != null && value !== "" ? value : "—");
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <div className="text-foreground mt-0.5 text-sm">{content}</div>
    </div>
  );
}

interface LeadDetailTabsProps {
  lead: Lead;
  dealOpportunities: DealOpportunityWithCompany[];
}

export function LeadDetailTabs({ lead, dealOpportunities }: LeadDetailTabsProps) {
  const companyMeta = (opp: DealOpportunityWithCompany) =>
    opp.company
      ? {
          name: opp.company.name,
          industry: opp.company.industry ?? null,
          location: opp.company.location ?? null,
        }
      : null;

  return (
    <Tabs defaultValue="listing" className="w-full space-y-6">
      <TabsList className="w-full justify-start overflow-x-auto">
        <TabsTrigger value="listing">Raw Listing</TabsTrigger>
        <TabsTrigger value="financials">Financials</TabsTrigger>
        <TabsTrigger value="broker">Broker</TabsTrigger>
        <TabsTrigger value="company">Company Matching</TabsTrigger>
        <TabsTrigger value="status">Status</TabsTrigger>
        <TabsTrigger value="deals">Deal Opportunities</TabsTrigger>
      </TabsList>

      <TabsContent value="listing" className="space-y-4">
        <Field label="Title" value={lead.rawTitle} />
        <Field label="Description">
          {lead.rawDescription ? (
            <p className="whitespace-pre-wrap leading-relaxed">
              {lead.rawDescription}
            </p>
          ) : (
            "—"
          )}
        </Field>
        <Field label="Source Website" value={lead.sourceWebsite} />
        <Field label="External Listing ID" value={lead.externalListingId ?? undefined} />
        <Field label="Industry" value={lead.rawIndustry ?? undefined} />
      </TabsContent>

      <TabsContent value="financials" className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field
            label="Revenue"
            value={
              lead.revenue != null ? formatCurrency(lead.revenue) : undefined
            }
          />
          <Field
            label="EBITDA"
            value={
              lead.ebitda != null ? formatCurrency(lead.ebitda) : undefined
            }
          />
          <Field
            label="Asking Price"
            value={
              lead.askingPrice != null
                ? formatCurrency(lead.askingPrice)
                : undefined
            }
          />
        </div>
        {lead.revenue == null && lead.ebitda == null && lead.askingPrice == null && (
          <p className="text-muted-foreground text-sm">No financial data.</p>
        )}
      </TabsContent>

      <TabsContent value="broker" className="space-y-4">
        <Field label="Brokerage" value={lead.brokerage ?? undefined} />
        <Field label="First Name" value={lead.brokerFirstName ?? undefined} />
        <Field label="Last Name" value={lead.brokerLastName ?? undefined} />
        {lead.brokerEmail && (
          <div className="flex items-center gap-2">
            <Mail className="text-muted-foreground h-4 w-4" />
            <a
              href={`mailto:${lead.brokerEmail}`}
              className="text-primary text-sm hover:underline"
            >
              {lead.brokerEmail}
            </a>
          </div>
        )}
        {lead.brokerPhone && (
          <div className="flex items-center gap-2">
            <Phone className="text-muted-foreground h-4 w-4" />
            <a
              href={`tel:${lead.brokerPhone}`}
              className="text-primary text-sm hover:underline"
            >
              {lead.brokerPhone}
            </a>
          </div>
        )}
        {!lead.brokerage &&
          !lead.brokerFirstName &&
          !lead.brokerLastName &&
          !lead.brokerEmail &&
          !lead.brokerPhone && (
            <p className="text-muted-foreground text-sm">No broker information.</p>
          )}
      </TabsContent>

      <TabsContent value="company" className="space-y-4">
        <Field
          label="Normalized Company Name"
          value={lead.normalizedCompanyName ?? undefined}
        />
        <Field label="Company Location" value={lead.companyLocation ?? undefined} />
        {!lead.normalizedCompanyName && !lead.companyLocation && (
          <p className="text-muted-foreground text-sm">No company matching data.</p>
        )}
      </TabsContent>

      <TabsContent value="status" className="space-y-4">
        <div>
          <p className="text-muted-foreground text-xs">Lead Status</p>
          <Badge className={getStatusColor(lead.status)}>{lead.status}</Badge>
        </div>
        <Field
          label="Processed At"
          value={
            lead.processedAt
              ? new Date(lead.processedAt).toLocaleString()
              : undefined
          }
        />
        <Field
          label="Created At"
          value={new Date(lead.createdAt).toLocaleString()}
        />
      </TabsContent>

      <TabsContent value="deals" className="space-y-4">
        {dealOpportunities.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No deal opportunities linked to this lead.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {dealOpportunities.map((opp) => (
              <DealOppCard
                key={opp.id}
                opp={opp}
                company={companyMeta(opp)}
              />
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
