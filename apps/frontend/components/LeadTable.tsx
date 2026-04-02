
import type { Lead } from "@repo/db";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import LeadActionsMenu from "@/components/LeadActionsMenu";

interface LeadTableProps {
  data: Lead[];
  onSelectLead?: (lead: Lead) => void;
}

export default function LeadTable({ data, onSelectLead }: LeadTableProps) {
  if (data.length === 0) {
    return (
      <div className="mt-12 text-center">
        <p className="text-muted-foreground text-xl">No leads found.</p>
      </div>
    );
  }

  return (
    <div className="bg-card overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Industry</TableHead>
            <TableHead className="text-right">Revenue</TableHead>
            <TableHead className="text-right">EBITDA</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[1%] text-right whitespace-nowrap">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((lead) => (
            <TableRow
              key={lead.id}
              className="hover:bg-muted/60 cursor-pointer"
              onClick={() => onSelectLead?.(lead)}
            >
              <TableCell className="max-w-xs truncate font-medium">
                {lead.rawTitle}
              </TableCell>
              <TableCell className="max-w-[180px] truncate">
                {lead.rawIndustry || "—"}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {lead.revenue != null ? formatCurrency(lead.revenue) : "—"}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {lead.ebitda != null ? formatCurrency(lead.ebitda) : "—"}
              </TableCell>
              <TableCell className="text-muted-foreground max-w-[220px] truncate text-xs">
                {lead.sourceWebsite || "—"}
              </TableCell>
              <TableCell className="text-xs font-medium">
                {lead.status}
              </TableCell>
              <TableCell
                className="text-right"
                onClick={(event) => {
                  // Prevent row click when using the actions menu
                  event.stopPropagation();
                }}
              >
                <LeadActionsMenu
                  lead={lead}
                  onViewDetails={() => onSelectLead?.(lead)}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
