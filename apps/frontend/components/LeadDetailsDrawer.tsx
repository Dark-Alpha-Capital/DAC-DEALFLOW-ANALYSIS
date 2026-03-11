"use client";

import { useState } from "react";
import type { Lead } from "@repo/db";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { toast } from "sonner";
import DeleteEntityDialog from "@/components/DeleteEntityDialog";

interface LeadDetailsDrawerProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getStatusColor(status: string): string {
  switch (status) {
    case "NEW":
      return "bg-primary/10 text-primary";
    case "PROCESSED":
      return "bg-green-500/10 text-green-600 dark:text-green-400";
    case "DUPLICATE":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
    case "REJECTED":
      return "bg-destructive/10 text-destructive";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export default function LeadDetailsDrawer({
  lead,
  open,
  onOpenChange,
}: LeadDetailsDrawerProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { mutate: deleteLead, isPending: isDeleting } = useMutation(
    trpc.leads.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Lead deleted");
        setDeleteDialogOpen(false);
        onOpenChange(false);
        router.refresh();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete lead");
      },
    }),
  );

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 pb-6">
          {lead ? (
            <>
              <DrawerHeader className="space-y-2">
                <DrawerTitle className="flex items-center justify-between gap-3">
                  <span className="line-clamp-2 wrap-break-word text-left text-base font-semibold">
                    {lead.rawTitle}
                  </span>
                  <Badge className={getStatusColor(lead.status)}>
                    {lead.status}
                  </Badge>
                </DrawerTitle>
                <DrawerDescription className="text-xs">
                  {lead.brokerage}
                  {lead.companyLocation && lead.brokerage && " • "}
                  {lead.companyLocation}
                  {lead.rawIndustry && (
                    <>
                      {(lead.brokerage || lead.companyLocation) && " • "}
                      {lead.rawIndustry}
                    </>
                  )}
                </DrawerDescription>
              </DrawerHeader>

              <div className="space-y-4 px-4 text-sm">
                {(lead.revenue != null ||
                  lead.ebitda != null ||
                  lead.askingPrice != null) && (
                  <div className="space-y-2">
                    <p className="text-muted-foreground text-xs font-medium">
                      Financials
                    </p>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {lead.revenue != null && (
                        <div>
                          <p className="text-muted-foreground text-xs">
                            Revenue
                          </p>
                          <p className="font-medium tabular-nums">
                            {formatCurrency(lead.revenue)}
                          </p>
                        </div>
                      )}
                      {lead.ebitda != null && (
                        <div>
                          <p className="text-muted-foreground text-xs">
                            EBITDA
                          </p>
                          <p className="font-medium tabular-nums">
                            {formatCurrency(lead.ebitda)}
                          </p>
                        </div>
                      )}
                      {lead.askingPrice != null && (
                        <div>
                          <p className="text-muted-foreground text-xs">
                            Asking price
                          </p>
                          <p className="font-medium tabular-nums">
                            {formatCurrency(lead.askingPrice)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {lead.rawDescription && (
                  <div className="space-y-2">
                    <p className="text-muted-foreground text-xs font-medium">
                      Description
                    </p>
                    <p className="whitespace-pre-wrap text-xs leading-relaxed">
                      {lead.rawDescription}
                    </p>
                  </div>
                )}
              </div>

              <DrawerFooter className="flex flex-row items-center justify-between gap-3 border-t pt-4">
                <div className="text-muted-foreground text-xs">
                  Added {new Date(lead.createdAt).toLocaleDateString()}
                </div>
                <div className="flex gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link
                      href={`/leads/${lead.id}`}
                      className="inline-flex items-center gap-1.5"
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link
                      href={`/leads/${lead.id}/edit`}
                      className="inline-flex items-center gap-1.5"
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setDeleteDialogOpen(true)}
                    disabled={isDeleting}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </DrawerFooter>
              <DeleteEntityDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                title="Delete lead?"
                description="This will permanently delete this lead. This action cannot be undone."
                isPending={isDeleting}
                onConfirm={() => lead && deleteLead({ id: lead.id })}
              />
            </>
          ) : (
            <div className="space-y-2 px-4 py-6">
              <p className="text-sm font-medium">No lead selected</p>
              <p className="text-muted-foreground text-xs">
                Select a lead from the table to view its details.
              </p>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

