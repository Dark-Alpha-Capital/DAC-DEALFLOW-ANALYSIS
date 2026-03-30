
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import LLMExplanationViewer from "@/components/LLMExplanationViewer";

interface ScreenerResultsListProps {
  items: {
    id: string;
    stage: string;
    status: string;
    companyName: string | null;
    companyLocation: string | null;
    companyIndustry: string | null;
    revenue: number | null;
    ebitda: number | null;
    screenings: {
      id: string;
      title: string;
      sentiment: string;
      score: number | null;
      explanation: string;
      createdAt: string;
    }[];
  }[];
}

export default function ScreenerResultsList({ items }: ScreenerResultsListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(
    items[0]?.id ?? null,
  );

  if (items.length === 0) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-md border bg-muted/40 p-6 text-sm text-muted-foreground">
        No screened deals yet. Run AI screening on deals to see them here.
      </div>
    );
  }

  return (
    <div className="divide-y rounded-md border bg-background">
      {items.map((item) => {
        const latest = item.screenings[0];
        const isExpanded = expandedId === item.id;

        return (
          <div key={item.id} className="px-3 py-2 text-xs">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 text-left"
              onClick={() =>
                setExpandedId((prev) => (prev === item.id ? null : item.id))
              }
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-[11px] font-medium text-foreground">
                    {item.companyName ?? "Deal opportunity"}
                  </p>
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                    {item.stage}
                  </span>
                </div>
                <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                  {latest?.title}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {typeof latest?.score === "number" && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                    {latest.score}/100
                  </span>
                )}
                <ChevronIcon expanded={isExpanded} />
              </div>
            </button>

            {isExpanded && (
              <div className="mt-3 space-y-2 border-t pt-3">
                {item.companyIndustry || item.companyLocation ? (
                  <p className="text-[10px] text-muted-foreground">
                    {[item.companyIndustry, item.companyLocation]
                      .filter(Boolean)
                      .join(" • ")}
                  </p>
                ) : null}
                <div className="space-y-3">
                  {item.screenings.map((screening) => (
                    <LLMExplanationViewer
                      key={screening.id}
                      title={screening.title}
                      explanation={screening.explanation}
                      sentiment={screening.sentiment}
                      score={screening.score}
                      createdAt={screening.createdAt}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  const Icon = expanded ? ChevronUp : ChevronDown;
  return (
    <span
      className={cn(
        "flex h-6 w-6 items-center justify-center rounded-full border text-muted-foreground",
        expanded && "bg-muted",
      )}
    >
      <Icon className="h-3 w-3" />
    </span>
  );
}

