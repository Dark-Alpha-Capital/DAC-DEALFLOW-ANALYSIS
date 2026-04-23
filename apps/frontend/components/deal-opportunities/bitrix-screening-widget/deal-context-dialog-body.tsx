import { Link } from "@tanstack/react-router";
import { Building2, ExternalLink, Layers, User } from "lucide-react";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { WidgetBootstrap } from "./types";
import { hasBitrixFieldValue } from "./utils";

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[88px_1fr] gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 font-medium wrap-break-word">{value}</span>
    </div>
  );
}

export function DealContextDialogBody({ data }: { data: WidgetBootstrap }) {
  const bitrixFilledFields = data.bitrixDealFields.filter((row) =>
    hasBitrixFieldValue(row.value),
  );

  return (
    <DialogContent className="flex max-h-[88vh] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
      <DialogHeader className="border-border/80 shrink-0 space-y-1 border-b px-6 py-4 text-left">
        <DialogTitle className="text-base">Deal context</DialogTitle>
        <DialogDescription className="text-xs leading-snug">
          Workspace summary, linked Bitrix CRM records, and non-empty deal
          fields from <code className="font-mono">crm.deal.get</code>{" "}
          (attachments omitted).
        </DialogDescription>
      </DialogHeader>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <Layers className="text-muted-foreground size-4" aria-hidden />
            <h3 className="text-sm font-semibold">Workspace</h3>
          </div>
          <div className="grid gap-1.5 text-sm">
            <SummaryRow label="Title" value={data.appDeal.title ?? "—"} />
            <SummaryRow label="Stage" value={data.appDeal.stage ?? "—"} />
          </div>
          <Link
            to="/deal-opportunities/$uid"
            params={{ uid: data.appDeal.id }}
            className="text-primary inline-flex cursor-pointer items-center gap-1 text-sm font-medium underline-offset-4 hover:underline"
          >
            Open in app
            <ExternalLink className="size-3.5" aria-hidden />
          </Link>
        </section>

        {data.bitrixLinkedContact || data.bitrixLinkedCompany ? (
          <section className="space-y-2">
            <div className="flex items-center gap-2">
              <Building2
                className="text-muted-foreground size-4"
                aria-hidden
              />
              <h3 className="text-sm font-semibold">Bitrix CRM</h3>
            </div>
            {data.bitrixLinkedCompany ? (
              <CompanyPanel
                company={data.bitrixLinkedCompany}
                portalBaseUrl={data.portalBaseUrl}
              />
            ) : null}
            {data.bitrixLinkedContact ? (
              <ContactPanel
                contact={data.bitrixLinkedContact}
                portalBaseUrl={data.portalBaseUrl}
              />
            ) : null}
          </section>
        ) : null}

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Bitrix deal fields</h3>
          <div className="border-border max-h-[min(40vh,360px)] overflow-auto border">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="border-border border-b px-2 py-1.5 font-semibold">
                    Label
                  </th>
                  <th className="border-border border-b px-2 py-1.5 font-semibold">
                    Value
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.bitrixDealFields.length === 0 ? (
                  <tr>
                    <td
                      colSpan={2}
                      className="text-muted-foreground px-2 py-3 text-center"
                    >
                      No Bitrix payload.
                    </td>
                  </tr>
                ) : bitrixFilledFields.length === 0 ? (
                  <tr>
                    <td
                      colSpan={2}
                      className="text-muted-foreground px-2 py-3 text-center"
                    >
                      No non-empty fields.
                    </td>
                  </tr>
                ) : (
                  bitrixFilledFields.map((row) => (
                    <tr
                      key={row.key}
                      className="border-border/60 border-b last:border-0"
                    >
                      <td className="text-foreground w-[min(40%,200px)] px-2 py-1.5 align-top font-medium">
                        {row.label}
                      </td>
                      <td className="max-w-[min(55vw,320px)] px-2 py-1.5 wrap-break-word whitespace-pre-wrap">
                        {row.value}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </DialogContent>
  );
}

function CompanyPanel({
  company,
  portalBaseUrl,
}: {
  company: NonNullable<WidgetBootstrap["bitrixLinkedCompany"]>;
  portalBaseUrl: WidgetBootstrap["portalBaseUrl"];
}) {
  const base = portalBaseUrl?.replace(/\/+$/, "");
  return (
    <div className="space-y-2 text-sm">
      <p className="font-medium">{company.title}</p>
      {company.industry ? (
        <p className="text-muted-foreground text-xs">{company.industry}</p>
      ) : null}
      {company.email ? (
        <p className="text-xs">
          <span className="text-muted-foreground">Email </span>
          {company.email}
        </p>
      ) : null}
      {company.phones ? (
        <p className="text-xs">
          <span className="text-muted-foreground">Phone </span>
          {company.phones}
        </p>
      ) : null}
      {company.website ? (
        <p className="text-xs">
          <span className="text-muted-foreground">Web </span>
          {company.website}
        </p>
      ) : null}
      {base ? (
        <a
          href={`${base}/crm/company/details/${company.id}/`}
          target="_blank"
          rel="noreferrer"
          className="text-primary inline-flex cursor-pointer items-center gap-1 text-xs font-medium underline-offset-4 hover:underline"
        >
          Company in Bitrix
          <ExternalLink className="size-3" aria-hidden />
        </a>
      ) : null}
    </div>
  );
}

function ContactPanel({
  contact,
  portalBaseUrl,
}: {
  contact: NonNullable<WidgetBootstrap["bitrixLinkedContact"]>;
  portalBaseUrl: WidgetBootstrap["portalBaseUrl"];
}) {
  const base = portalBaseUrl?.replace(/\/+$/, "");
  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium">{contact.displayName}</p>
        <User className="text-muted-foreground size-4 shrink-0" aria-hidden />
      </div>
      {contact.email ? (
        <p className="text-xs">
          <span className="text-muted-foreground">Email </span>
          {contact.email}
        </p>
      ) : null}
      {contact.phones ? (
        <p className="text-xs">
          <span className="text-muted-foreground">Phone </span>
          {contact.phones}
        </p>
      ) : null}
      {base ? (
        <a
          href={`${base}/crm/contact/details/${contact.id}/`}
          target="_blank"
          rel="noreferrer"
          className="text-primary inline-flex cursor-pointer items-center gap-1 text-xs font-medium underline-offset-4 hover:underline"
        >
          Contact in Bitrix
          <ExternalLink className="size-3" aria-hidden />
        </a>
      ) : null}
    </div>
  );
}
