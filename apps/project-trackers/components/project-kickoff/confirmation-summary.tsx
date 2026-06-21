import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SUMMARY_FIELDS, type ReviewDraft } from "./project-kickoff-draft-utils";

function SummaryRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="border-border/60 grid gap-1 border-b py-3 last:border-b-0 sm:grid-cols-[minmax(0,11rem)_1fr] sm:gap-4">
      <div className="text-muted-foreground text-[11px] font-medium tracking-[0.08em] uppercase">
        {label}
      </div>
      <div className="text-foreground min-w-0 text-sm leading-relaxed">
        {children}
      </div>
    </div>
  );
}

type ConfirmationSummaryProps = {
  draft: ReviewDraft;
};

export function ConfirmationSummary({ draft }: ConfirmationSummaryProps) {
  return (
    <div className="border-border/60 rounded-lg border bg-[#FBFBFA] px-3 sm:px-4">
      {SUMMARY_FIELDS.map(({ key, label, mono }) => {
        const value = draft[key].trim();
        return (
          <SummaryRow key={key} label={label}>
            <span
              className={cn(
                "whitespace-pre-wrap",
                mono && "font-mono text-xs",
                !value && "text-muted-foreground",
              )}
            >
              {value || "—"}
            </span>
          </SummaryRow>
        );
      })}
    </div>
  );
}
