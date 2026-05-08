
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Palette,
  Eye,
  Pencil,
  Trash2,
  Target,
  TrendingUp,
  ChevronRight,
} from "lucide-react";
import type { Theme } from "@repo/db";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@/lib/navigation-shim";
import { useTRPC } from "@/trpc/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function getStatusColor(status: string): string {
  switch (status) {
    case "ACTIVE":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    case "PAUSED":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
    case "RETIRED":
      return "bg-muted/80 text-muted-foreground border-border";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export default function ThemeCard({ theme }: { theme: Theme }) {
  const trpc = useTRPC();
  const router = useRouter();
  const { mutate: deleteTheme, isPending: isDeleting } = useMutation(
    trpc.themes.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Theme deleted");
        void router.invalidate();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete theme");
      },
    }),
  );

  const descPreview =
    theme.description.length > 120
      ? theme.description.slice(0, 120) + "..."
      : theme.description;

  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card",
        "shadow-sm transition-all duration-200 hover:shadow-md hover:border-border/80",
      )}
    >
      <Link
        to="/investment-themes/$uid"
        params={{ uid: theme.id }}
        className="absolute inset-0 z-0"
        aria-hidden
      />
      <div className="relative z-10 flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <span
              className={cn(
                "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
                getStatusColor(theme.status),
              )}
            >
              {theme.status}
            </span>
            <h3 className="mt-2 text-base font-semibold leading-tight text-foreground line-clamp-2">
              {theme.name}
            </h3>
            <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
              <Palette className="h-3.5 w-3.5 shrink-0" />
              {theme.sector}
            </p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        </div>

        <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
          {descPreview}
        </p>

        {(theme.capitalPriorityScore != null ||
          theme.confidenceScore != null) && (
          <div className="mt-4 flex gap-4">
            {theme.capitalPriorityScore != null && (
              <div className="flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  Priority:{" "}
                  <span className="font-medium text-foreground">
                    {theme.capitalPriorityScore}
                  </span>
                </span>
              </div>
            )}
            {theme.confidenceScore != null && (
              <div className="flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  Confidence:{" "}
                  <span className="font-medium text-foreground">
                    {theme.confidenceScore}
                  </span>
                </span>
              </div>
            )}
          </div>
        )}

        <div className="mt-4 flex gap-2 border-t border-border pt-4">
          <Button size="sm" className="flex-1 gap-1.5" asChild>
            <Link
              to="/investment-themes/$uid"
              params={{ uid: theme.id }}
              onClick={(e) => e.stopPropagation()}
            >
              <Eye className="h-3.5 w-3.5" />
              View
            </Link>
          </Button>
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1.5" asChild>
                  <Link
                    to="/investment-themes/$uid/edit"
                    params={{ uid: theme.id }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Edit theme</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      disabled={isDeleting}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Delete theme</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </AlertDialogTrigger>
            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete theme?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will archive &quot;{theme.name}&quot; and hide it from
                  active workflows.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteTheme({ id: theme.id })}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
