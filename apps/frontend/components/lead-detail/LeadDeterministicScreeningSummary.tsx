import type { LeadScreening } from "@repo/db/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScreenLeadButton } from "@/components/lead-detail/screen-lead-button";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@/lib/navigation-shim";
import { useTRPC } from "@/trpc/client";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

function DeleteLeadScreeningButton({ leadId }: { leadId: string }) {
  const trpc = useTRPC();
  const router = useRouter();
  const { mutate: deleteScreening, isPending } = useMutation(
    trpc.leads.deleteLeadDeterministicScreening.mutationOptions({
      onSuccess: () => {
        toast.success("Screening deleted");
        void router.invalidate();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete screening");
      },
    }),
  );

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Delete screening</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete screening?</AlertDialogTitle>
          <AlertDialogDescription>
            This will remove the rules-based screening result. You can re-run it
            anytime.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => deleteScreening({ leadId })}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function formatScreeningStatus(status: LeadScreening["status"]) {
  switch (status) {
    case "PASS":
      return "Pass";
    case "FAIL":
      return "Fail";
    case "INCOMPLETE":
      return "Incomplete";
    default:
      return status;
  }
}

export function LeadDeterministicScreeningSummary({
  screening,
  leadId,
}: {
  screening: LeadScreening | null;
  leadId: string;
}) {
  if (!screening) {
    return (
      <section className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-[0.14em]">
              Deterministic Screening
            </p>
            <h2 className="text-foreground mt-1 text-base font-semibold">
              No screening yet
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Unscreened</Badge>
            <ScreenLeadButton leadId={leadId} />
          </div>
        </div>
        <p className="text-muted-foreground text-sm">
          This lead has not been scored by the rules-based engine yet.
        </p>
      </section>
    );
  }

  const variant =
    screening.status === "PASS"
      ? "default"
      : screening.status === "FAIL"
        ? "destructive"
        : "secondary";

  return (
    <section className="space-y-4 rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-[0.14em]">
            Deterministic Screening
          </p>
          <h2 className="text-foreground mt-1 text-base font-semibold">
            Dark Alpha rules engine
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={variant}>
            {formatScreeningStatus(screening.status)}
          </Badge>
          <Badge variant="outline">
            Score {screening.score != null ? screening.score : "—"}
          </Badge>
          <ScreenLeadButton leadId={leadId} />
          <DeleteLeadScreeningButton leadId={leadId} />
        </div>
      </div>

      <dl className="grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-muted-foreground text-xs">EBITDA Fit</dt>
          <dd className="text-foreground mt-1 font-medium">
            {screening.ebitdaFitScore != null ? screening.ebitdaFitScore : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs">Revenue</dt>
          <dd className="text-foreground mt-1 font-medium">
            {screening.revenueScore != null ? screening.revenueScore : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs">Industry</dt>
          <dd className="text-foreground mt-1 font-medium">
            {screening.industryScore != null ? screening.industryScore : "—"}
          </dd>
        </div>
      </dl>

      {screening.reasons.length > 0 ? (
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-[0.14em]">
            Reasons
          </p>
          <ul className="text-muted-foreground space-y-1 text-sm">
            {screening.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">
          The lead passed all hard filters for the active Dark Alpha profile.
        </p>
      )}
    </section>
  );
}
