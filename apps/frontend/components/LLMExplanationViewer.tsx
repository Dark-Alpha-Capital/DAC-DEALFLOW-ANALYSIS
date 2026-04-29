import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface LLMExplanationViewerProps {
  title: string;
  explanation: string;
  sentiment: string;
  score?: number | null;
  createdAt?: string;
}

export default function LLMExplanationViewer({
  title,
  explanation,
  sentiment,
  score,
  createdAt,
}: LLMExplanationViewerProps) {
  const [expanded, setExpanded] = useState(false);
  const maxPreviewChars = 320;

  const isLong = explanation.length > maxPreviewChars;
  const previewText = isLong
    ? explanation.slice(0, maxPreviewChars).trimEnd() + "…"
    : explanation;

  const sentimentVariant =
    sentiment === "POSITIVE"
      ? "default"
      : sentiment === "NEGATIVE"
        ? "destructive"
        : "outline";

  return (
    <article className="bg-muted/40 rounded-md border p-3 text-xs">
      <header className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-foreground line-clamp-1 text-[11px] font-medium">
            {title}
          </p>
          {createdAt && (
            <p className="text-muted-foreground mt-0.5 text-[10px]">
              {new Date(createdAt).toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge
            variant={sentimentVariant as any}
            className={cn(
              "px-1.5 py-0.5 text-[10px]",
              sentiment === "NEUTRAL" && "border-muted-foreground/40",
            )}
          >
            {sentiment}
          </Badge>
          {typeof score === "number" && (
            <p className="text-muted-foreground text-[10px] font-medium">
              Score {score}/100
            </p>
          )}
        </div>
      </header>

      <p className="text-muted-foreground text-[11px] leading-relaxed whitespace-pre-wrap">
        {expanded ? explanation : previewText}
      </p>

      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="text-primary mt-2 inline-flex items-center gap-1 text-[11px] font-medium underline-offset-2 hover:underline"
        >
          {expanded ? (
            <>
              Show less
              <ChevronUp className="h-3 w-3" />
            </>
          ) : (
            <>
              Show full explanation
              <ChevronDown className="h-3 w-3" />
            </>
          )}
        </button>
      )}
    </article>
  );
}
