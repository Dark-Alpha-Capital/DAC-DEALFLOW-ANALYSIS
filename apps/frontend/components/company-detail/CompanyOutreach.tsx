import { Card } from "@/components/ui/card";

export type OutreachRow = {
  id: string;
  dealOpportunityId: string | null;
  companyId: string | null;
  type: string;
  notes: string | null;
  outcome: string | null;
  createdById: string | null;
  createdAt: Date;
  createdByName: string | null;
};

interface CompanyOutreachProps {
  outreach: OutreachRow[];
}

export function CompanyOutreach({ outreach }: CompanyOutreachProps) {
  if (outreach.length === 0) {
    return (
      <div className="border-border space-y-4 border-b pb-6">
        <h2 className="text-muted-foreground text-sm font-medium">
          Outreach history
        </h2>
        <p className="text-muted-foreground text-xs">
          No outreach has been recorded for this company yet.
        </p>
      </div>
    );
  }

  return (
    <div className="border-border space-y-4 border-b pb-6">
      <h2 className="text-muted-foreground text-sm font-medium">
        Outreach history
      </h2>
      <div className="space-y-3">
        {outreach.map((row) => (
          <Card key={row.id} className="space-y-2 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-medium text-foreground">{row.type}</span>
              <span className="text-muted-foreground">
                {new Date(row.createdAt).toLocaleDateString()}
              </span>
            </div>
            {row.outcome && (
              <p className="text-muted-foreground text-xs">
                <span className="font-medium">Outcome:</span> {row.outcome}
              </p>
            )}
            {row.notes && (
              <p className="text-muted-foreground text-xs">{row.notes}</p>
            )}
            {row.createdByName && (
              <p className="text-muted-foreground text-xs">
                By {row.createdByName}
              </p>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
