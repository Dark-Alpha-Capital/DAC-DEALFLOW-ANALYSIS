import { Link } from "@tanstack/react-router";
import { Building2, MapPin } from "lucide-react";

interface ThemeCompaniesListProps {
  companies: {
    id: string;
    name: string;
    industry: string | null;
    location: string | null;
  }[];
}

export default function ThemeCompaniesList({
  companies,
}: ThemeCompaniesListProps) {
  if (companies.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No companies are currently linked to this theme.
      </p>
    );
  }

  return (
    <div className="divide-y rounded-md border bg-background">
      {companies.map((company) => (
        <Link
          key={company.id}
          href={`/companies/${company.id}`}
          className="flex items-start justify-between gap-3 px-3 py-2 text-xs transition-colors hover:bg-muted/60"
        >
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[11px] font-medium text-foreground">
              <Building2 className="h-3 w-3 text-muted-foreground" />
              <span className="truncate">{company.name}</span>
            </p>
            <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
              {company.industry || "—"}
            </p>
          </div>
          {company.location && (
            <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span className="line-clamp-1">{company.location}</span>
            </p>
          )}
        </Link>
      ))}
    </div>
  );
}

