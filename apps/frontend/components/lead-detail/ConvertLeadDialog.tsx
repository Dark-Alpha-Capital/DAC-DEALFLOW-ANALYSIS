import * as React from "react";
import { useRouter } from "@/lib/navigation-shim";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import type { Lead } from "@repo/db";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import ConvertLeadToCompanyForm, {
  getDefaultValues,
} from "./ConvertLeadToCompanyForm";

interface ConvertLeadDialogProps {
  lead: Lead;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ConvertLeadDialog({
  lead,
  open,
  onOpenChange,
  onSuccess,
}: ConvertLeadDialogProps) {
  const router = useRouter();
  const trpc = useTRPC();

  const handleFormSuccess = React.useCallback(
    (data: { companyId: string | null; dealOpportunityId?: string | null }) => {
      onOpenChange(false);
      onSuccess?.();
      if (data.dealOpportunityId) {
        void router.invalidate();
        router.push(`/deal-opportunities/${data.dealOpportunityId}`);
      } else if (data.companyId) {
        void router.invalidate();
        router.push(`/companies/${data.companyId}`);
      }
    },
    [onOpenChange, onSuccess, router],
  );

  const { mutate: quickConvert, isPending: isQuickPending } = useMutation(
    trpc.leads.convertToCompany.mutationOptions({
      onSuccess: (data) => {
        toast.success("Lead converted to deal opportunity");
        onOpenChange(false);
        onSuccess?.();
        if (data.dealOpportunityId) {
          void router.invalidate();
          router.push(`/deal-opportunities/${data.dealOpportunityId}`);
        } else if (data.companyId) {
          void router.invalidate();
          router.push(`/companies/${data.companyId}`);
        }
      },
      onError: (error) => {
        toast.error(error.message || "Failed to convert lead");
      },
    }),
  );

  const handleQuickConvert = () => {
    const defaults = getDefaultValues(lead);
    if (!defaults.name) {
      toast.error(
        "Lead has no usable company name. Use the form to customize.",
      );
      return;
    }
    quickConvert({
      id: lead.id,
      name: defaults.name,
      normalizedName: `quickconvert_${lead.id}`,
      industry: defaults.industry || undefined,
      location: defaults.location || undefined,
      revenueEstimate: defaults.revenueEstimate,
      ebitdaEstimate: defaults.ebitdaEstimate,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Convert lead to deal opportunity</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={handleQuickConvert}
              disabled={isQuickPending}
            >
              {isQuickPending ? "Converting..." : "Quick convert"}
            </Button>
          </div>
          <div className="border-t pt-4">
            <p className="text-muted-foreground mb-3 text-xs">
              Optional company details (can attach later):
            </p>
            <ConvertLeadToCompanyForm
              lead={lead}
              onSuccess={handleFormSuccess}
              compact
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
