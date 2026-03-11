"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone } from "lucide-react";
import { formatCurrency, formatDateTimeStable } from "@/lib/utils";
import { getLeadStatusClassName } from "@/lib/lead-status";

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
  lead: LeadDetailLead;
}

export function LeadDetailTabs({ lead }: LeadDetailTabsProps) {
  return (
    <Tabs defaultValue="listing" className="w-full space-y-6">
      <TabsList className="w-full justify-start overflow-x-auto">
        <TabsTrigger value="listing">Raw Listing</TabsTrigger>
        <TabsTrigger value="financials">Financials</TabsTrigger>
        <TabsTrigger value="broker">Broker</TabsTrigger>
        <TabsTrigger value="company">Company Matching</TabsTrigger>
        <TabsTrigger value="status">Status</TabsTrigger>
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
          <Badge className={getLeadStatusClassName(lead.status)}>{lead.status}</Badge>
        </div>
        <Field
          label="Processed At"
          value={
            lead.processedAt
              ? formatDateTimeStable(lead.processedAt)
              : undefined
          }
        />
        <Field
          label="Created At"
          value={formatDateTimeStable(lead.createdAt)}
        />
      </TabsContent>
    </Tabs>
  );
}

type LeadDetailLead = {
  status: string;
  createdAt: Date | string;
  processedAt?: Date | string | null;
  rawTitle?: string | null;
  rawDescription?: string | null;
  sourceWebsite?: string | null;
  externalListingId?: string | null;
  rawIndustry?: string | null;
  revenue?: number | null;
  ebitda?: number | null;
  askingPrice?: number | null;
  brokerage?: string | null;
  brokerFirstName?: string | null;
  brokerLastName?: string | null;
  brokerEmail?: string | null;
  brokerPhone?: string | null;
  normalizedCompanyName?: string | null;
  companyLocation?: string | null;
};
