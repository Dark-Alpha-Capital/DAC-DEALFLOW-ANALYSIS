import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { useTRPC } from "@/trpc/client";
import { useRouter } from "@/lib/navigation-shim";
import { PROJECT_TRACKERS_INDEX_DEFAULT_SEARCH } from "@/lib/route-search";
import { Button } from "@/components/ui/button";
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

export default function DeleteProjectTrackerButton({
  kickoffId,
  redirectAfterDelete = false,
}: {
  kickoffId: string;
  redirectAfterDelete?: boolean;
}) {
  const trpc = useTRPC();
  const router = useRouter();
  const defaultSearch = new URLSearchParams(
    PROJECT_TRACKERS_INDEX_DEFAULT_SEARCH,
  ).toString();

  const { mutate: deleteTracker, isPending } = useMutation(
    trpc.projectTrackers.delete.mutationOptions({
      onSuccess: async () => {
        router.invalidate();
        toast.success("Project deleted successfully");
        if (redirectAfterDelete) {
          router.push(`/project-trackers?${defaultSearch}`);
        }
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete project");
      },
    }),
  );

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" className="gap-1.5">
          <Trash2 className="size-4" />
          Delete project
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this project?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes the project and all its extracted data,
            AI score, and analysis. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => deleteTracker({ kickoffId })}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? "Deleting…" : "Yes, delete project"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
