
import * as React from "react";
import { useRouter } from "@/lib/navigation-shim";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { QuickAddDealForm } from "@/components/forms/quick-add-deal-form";

interface QuickAddDealDialogProps {
  trigger?: React.ReactNode;
}

export function QuickAddDealDialog({ trigger }: QuickAddDealDialogProps) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="gap-2">
            Quick add
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[min(90vh,900px)] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Quick add deal</DialogTitle>
        </DialogHeader>
        <QuickAddDealForm
          className="space-y-8"
          onCancel={() => setOpen(false)}
          onSuccess={(data) => {
            setOpen(false);
            router.push(`/deal-opportunities/${data.dealOpportunityId}`);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
