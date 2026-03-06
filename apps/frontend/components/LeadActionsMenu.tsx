"use client";

import { MoreHorizontal } from "lucide-react";
import type { Lead } from "db";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { toast } from "sonner";

interface LeadActionsMenuProps {
  lead: Lead;
  onViewDetails?: () => void;
}

export default function LeadActionsMenu({
  lead,
  onViewDetails,
}: LeadActionsMenuProps) {
  const trpc = useTRPC();
  const router = useRouter();

  const { mutate: rejectLead, isPending: isRejecting } = useMutation(
    trpc.leads.reject.mutationOptions({
      onSuccess: () => {
        toast.success("Lead rejected");
        router.refresh();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to reject lead");
      },
    }),
  );

  const { mutate: convertToCompany, isPending: isConverting } = useMutation(
    trpc.leads.convertToCompany.mutationOptions({
      onSuccess: (data) => {
        toast.success("Lead converted to company");
        if (data?.companyId) {
          router.push(`/companies/${data.companyId}`);
        } else {
          router.refresh();
        }
      },
      onError: (error) => {
        toast.error(error.message || "Failed to convert lead");
      },
    }),
  );

  const isBusy = isRejecting || isConverting;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label="Open lead actions menu"
          disabled={isBusy}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => {
            onViewDetails?.();
          }}
        >
          View details
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => convertToCompany({ id: lead.id })}
          disabled={isConverting}
        >
          Convert to company
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive focus:bg-destructive/10 focus:text-destructive"
          onClick={() => rejectLead({ id: lead.id })}
          disabled={isRejecting}
        >
          Reject
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

