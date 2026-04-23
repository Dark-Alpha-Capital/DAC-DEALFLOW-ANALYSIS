import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Inline navigation row for a wizard step. Purely typographic—no sticky bar,
 * no background, no border—so it sits quietly above the step content.
 */
export function StepHeaderNav({
  stepLabel,
  back,
  next,
}: {
  stepLabel: string;
  back?: { label: string; onClick: () => void; disabled?: boolean };
  next?: { label: string; onClick: () => void; disabled?: boolean };
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-3">
        {back ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground -ml-2 h-8 cursor-pointer gap-1.5 px-2"
            onClick={back.onClick}
            disabled={back.disabled}
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            {back.label}
          </Button>
        ) : null}
        <span className="text-muted-foreground hidden text-[10px] font-semibold tracking-[0.16em] uppercase sm:inline">
          {stepLabel}
        </span>
      </div>
      {next ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-foreground hover:bg-muted/50 h-8 cursor-pointer gap-1.5"
          onClick={next.onClick}
          disabled={next.disabled}
        >
          {next.label}
          <ArrowRight className="size-3.5" aria-hidden />
        </Button>
      ) : null}
    </div>
  );
}
