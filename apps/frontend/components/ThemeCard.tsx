"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Palette, Eye, Pencil, Trash2 } from "lucide-react";
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
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { toast } from "sonner";

function getStatusColor(status: string): string {
  switch (status) {
    case "ACTIVE":
      return "bg-green-500/10 text-green-600 dark:text-green-400";
    case "PAUSED":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
    case "RETIRED":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export default function ThemeCard({ theme }: { theme: Theme }) {
  const trpc = useTRPC();
  const router = useRouter();
  const { mutate: deleteTheme, isPending: isDeleting } = useMutation(
    trpc.themes.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Theme deleted");
        router.refresh();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete theme");
      },
    }),
  );

  const descPreview =
    theme.description.length > 80
      ? theme.description.slice(0, 80) + "..."
      : theme.description;

  return (
    <div className="flex flex-col border-b border-border bg-background py-5 transition-colors hover:bg-muted/40">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <span
            className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${getStatusColor(theme.status)}`}
          >
            {theme.status}
          </span>
          <h3 className="mt-1.5 text-sm font-semibold text-foreground">
            {theme.name}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            <Palette className="mr-1 inline h-3 w-3" />
            {theme.sector}
          </p>
        </div>
      </div>

      <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">
        {descPreview}
      </p>

      <div className="mt-4 flex gap-2 border-t border-border pt-4">
        <Button size="sm" className="flex-1 gap-1.5" asChild>
          <Link href={`/themes/${theme.id}`}>
            <Eye className="h-3.5 w-3.5" />
            View
          </Link>
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5" asChild>
          <Link href={`/themes/${theme.id}/edit`}>
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Link>
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="destructive" disabled={isDeleting}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete theme?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete &quot;{theme.name}&quot;. This action
                cannot be undone.
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
  );
}
