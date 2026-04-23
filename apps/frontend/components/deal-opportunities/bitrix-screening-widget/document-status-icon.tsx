import { memo } from "react";
import { AlertCircle, CheckCircle2, CircleMinus, Loader2 } from "lucide-react";
import { INGEST_IN_FLIGHT } from "./utils";

export const DocumentStatusIcon = memo(function DocumentStatusIcon({
  status,
}: {
  status: string;
}) {
  if (INGEST_IN_FLIGHT.has(status)) {
    return (
      <Loader2
        className="size-3.5 shrink-0 animate-spin text-amber-600 motion-reduce:animate-none dark:text-amber-400"
        aria-hidden
      />
    );
  }
  if (status === "PROCESSED") {
    return (
      <CheckCircle2
        className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400"
        aria-hidden
      />
    );
  }
  if (status === "FAILED") {
    return (
      <AlertCircle className="text-destructive size-3.5 shrink-0" aria-hidden />
    );
  }
  if (status === "SKIPPED") {
    return (
      <CircleMinus
        className="text-muted-foreground size-3.5 shrink-0"
        aria-hidden
      />
    );
  }
  return null;
});
