import { memo } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { INGEST_IN_FLIGHT } from "./utils";

export const DocumentStatusIcon = memo(function DocumentStatusIcon({
  status,
}: {
  status: string;
}) {
  if (INGEST_IN_FLIGHT.has(status)) {
    return (
      <Loader2
        className="text-muted-foreground size-3.5 shrink-0 animate-spin motion-reduce:animate-none"
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
  return null;
});
