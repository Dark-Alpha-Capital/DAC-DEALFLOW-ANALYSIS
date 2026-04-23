import type { ReactNode } from "react";
import { BookMarked, Layers } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import type { ScreeningMode } from "./types";

const MODES: {
  id: ScreeningMode;
  label: string;
  Icon: typeof Layers;
  description: ReactNode;
  whenToUse: string;
}[] = [
  {
    id: "rag",
    label: "Deal RAG",
    Icon: Layers,
    description: (
      <>
        Combines evidence from{" "}
        <span className="text-foreground">all indexed files</span> on this deal.
        Questions pull a focused slice of chunks across the corpus.
      </>
    ),
    whenToUse:
      "You want the screener to consider the full deal packet—teaser, CIM, supplements—together.",
  },
  {
    id: "monograph",
    label: "Single-file (monograph)",
    Icon: BookMarked,
    description: (
      <>
        Screens <span className="text-foreground">one document only</span>. The
        same text window is used for every question—no per-question retrieval.
      </>
    ),
    whenToUse:
      "One SIM or CIM should drive the scorecard, or you want answers grounded strictly in that file.",
  },
];

export function ModePicker({
  value,
  onChange,
}: {
  value: ScreeningMode;
  onChange: (mode: ScreeningMode) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.16em] uppercase">
        Screening mode
      </p>
      <RadioGroup
        value={value}
        onValueChange={(v) => onChange(v as ScreeningMode)}
        className="grid gap-0 sm:grid-cols-2 sm:gap-8"
      >
        {MODES.map(({ id, label, Icon, description, whenToUse }) => {
          const selected = value === id;
          const htmlId = `bitrix-screening-mode-${id}`;
          return (
            <label
              key={id}
              htmlFor={htmlId}
              className={cn(
                "group relative flex cursor-pointer gap-3 border-l-2 py-3 pl-4 pr-2 transition-colors",
                selected
                  ? "border-foreground"
                  : "border-transparent hover:border-border",
              )}
            >
              <RadioGroupItem
                value={id}
                id={htmlId}
                className="mt-[3px] shrink-0"
              />
              <div className="min-w-0 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Icon
                    className={cn(
                      "size-3.5 shrink-0 transition-colors",
                      selected ? "text-foreground" : "text-muted-foreground",
                    )}
                    aria-hidden
                  />
                  <span
                    className={cn(
                      "text-sm leading-tight font-semibold tracking-tight",
                      selected ? "text-foreground" : "text-foreground/80",
                    )}
                  >
                    {label}
                  </span>
                </div>
                <p className="text-muted-foreground max-w-[38ch] text-[12.5px] leading-relaxed">
                  {description}
                </p>
                <p className="text-muted-foreground/90 max-w-[38ch] text-[11.5px] leading-relaxed">
                  <span className="text-foreground/70 font-medium">
                    Use when:
                  </span>{" "}
                  {whenToUse}
                </p>
              </div>
            </label>
          );
        })}
      </RadioGroup>
    </div>
  );
}
