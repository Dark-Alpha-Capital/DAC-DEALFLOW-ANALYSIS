import { useState } from "react";
import type { Lead } from "@repo/db";
import { Link } from "@tanstack/react-router";
import { useRouter } from "@/lib/navigation-shim";
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
import { Eye, Pencil, Trash2, Building2 } from "lucide-react";
import { ConvertLeadDialog } from "@/components/lead-detail/ConvertLeadDialog";
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
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);

  const { mutate: deleteLead, isPending: isDeleting } = useMutation(
    trpc.leads.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Lead deleted");
        setDeleteDialogOpen(false);
        onOpenChange(false);
        void router.invalidate();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete lead");
      },
    }),
  );

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      direction="right"
      shouldScaleBackground={false}
    >
      <DrawerContent className="bg-background fixed inset-y-0 right-0 left-auto z-50 mt-0 flex h-full w-full max-w-lg flex-col rounded-none rounded-l-xl border-0 border-l p-0 sm:max-w-xl md:max-w-2xl lg:max-w-3xl [&>div:first-child]:hidden">
        <div className="flex min-h-0 flex-1 flex-col">
          {lead ? (
            <>
              {/* Top: title + status + meta (pinned) */}
              <DrawerHeader className="shrink-0 gap-3 border-b px-4 pt-6 pb-4 text-left sm:px-6">
                <div className="flex flex-col gap-2">
                  <DrawerTitle className="line-clamp-3 text-left text-lg leading-snug font-semibold">
                    {lead.rawTitle}
                  </DrawerTitle>
                  <Badge className={`w-fit ${getStatusColor(lead.status)}`}>
                    {lead.status}
                  </Badge>
                </div>
                <DrawerDescription className="text-left text-xs">
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

              {/* Middle: scrolls; footer actions stay visible below (shadcn scrollable pattern) */}
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 text-sm sm:px-6">
                {(lead.revenue != null ||
                  lead.ebitda != null ||
                  lead.askingPrice != null) && (
                  <div className="space-y-3">
                    <p className="text-muted-foreground text-xs font-medium">
                      Financials
                    </p>
                    <div className="grid gap-4 sm:grid-cols-3">
                      {lead.revenue != null && (
                        <div className="space-y-1">
                          <p className="text-muted-foreground text-xs">
                            Revenue
                          </p>
                          <p className="font-medium tabular-nums">
                            {formatCurrency(lead.revenue)}
                          </p>
                        </div>
                      )}
                      {lead.ebitda != null && (
                        <div className="space-y-1">
                          <p className="text-muted-foreground text-xs">
                            EBITDA
                          </p>
                          <p className="font-medium tabular-nums">
                            {formatCurrency(lead.ebitda)}
                          </p>
                        </div>
                      )}
                      {lead.askingPrice != null && (
                        <div className="space-y-1">
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
                  <div
                    className={
                      lead.revenue != null ||
                      lead.ebitda != null ||
                      lead.askingPrice != null
                        ? "mt-6 space-y-2"
                        : "space-y-2"
                    }
                  >
                    <p className="text-muted-foreground text-xs font-medium">
                      Description
                    </p>
                    <p className="text-xs leading-relaxed whitespace-pre-wrap">
                      {lead.rawDescription}
                    </p>
                  </div>
                )}
              </div>

              {/* Bottom: actions (pinned) */}
              <DrawerFooter className="shrink-0 flex-col gap-4 border-t px-4 pt-4 pb-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div className="text-muted-foreground order-2 text-xs sm:order-1">
                  Added {new Date(lead.createdAt).toLocaleDateString()}
                </div>
                <div className="flex w-full flex-wrap gap-2 sm:order-2 sm:w-auto sm:justify-end">
                  <Button asChild size="sm" variant="outline">
                    <Link
                      to="/leads/$uid"
                      params={{ uid: lead.id }}
                      className="inline-flex items-center gap-1.5"
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </Link>
                  </Button>
                  {lead.status !== "DUPLICATE" && (
                    <Button
                      size="sm"
                      variant="default"
                      className="gap-1.5"
                      onClick={() => setConvertDialogOpen(true)}
                    >
                      <Building2 className="h-4 w-4" />
                      Convert to company
                    </Button>
                  )}
                  <Button asChild size="sm" variant="outline">
                    <Link
                      to="/leads/$uid/edit"
                      params={{ uid: lead.id }}
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
              {lead.status !== "DUPLICATE" && (
                <ConvertLeadDialog
                  lead={lead}
                  open={convertDialogOpen}
                  onOpenChange={setConvertDialogOpen}
                  onSuccess={() => onOpenChange(false)}
                />
              )}
            </>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col justify-center gap-2 px-4 py-10 text-center sm:px-6">
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
