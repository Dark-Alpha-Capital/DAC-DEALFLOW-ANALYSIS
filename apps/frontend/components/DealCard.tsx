"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  DollarSign,
  Edit,
  Trash2,
  MapPin,
  Briefcase,
  Building2,
  TrendingUp,
  Eye,
  Zap,
  CheckCircle2,
  Clock,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Deal } from "db";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  calculateEbitdaMargin,
  formatCurrency,
  formatPercent,
} from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

export default function DealCard({
  deal,
  className,
  showActions = true,
  showScreenButton = true,
}: {
  deal: Deal;
  className?: string;
  showActions?: boolean;
  showScreenButton?: boolean;
}) {
  const editLink = `/raw-deals/${deal.id}/edit`;
  const detailLink = `/raw-deals/${deal.id}`;
  const screenLink = `/raw-deals/${deal.id}/screen`;

  const { toast } = useToast();
  const trpc = useTRPC();

  const { mutate: deleteDeal, isPending: isDeleting } = useMutation(
    trpc.deals.delete.mutationOptions({
      onSuccess: () => {
        toast({
          title: "Deal Deleted",
          description: "Deal deleted successfully",
        });
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: error.message || "Failed to delete deal",
          variant: "destructive",
        });
      },
    }),
  );

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    deleteDeal({ id: deal.id, dealType: deal.dealType });
  };

  const ebitdaMargin = calculateEbitdaMargin(deal.ebitda, deal.revenue);

  const captionPreview =
    deal.dealCaption.trim().split(/\s+/).length > 5
      ? deal.dealCaption.trim().split(/\s+/).slice(0, 5).join(" ") + "..."
      : deal.dealCaption;

  return (
    <div
      className={cn(
        "group flex flex-col border-b border-border bg-background py-5 transition-colors hover:bg-muted/40",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "text-xs font-medium",
                deal.isPublished ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {deal.isPublished && (
                <CheckCircle2 className="mr-1 inline h-3 w-3" />
              )}
              {deal.isPublished ? "Published" : "Draft"}
            </span>
            <span className="text-border">·</span>
            <span className="text-xs text-muted-foreground">
              {deal.isReviewed ? (
                <>
                  <CheckCircle2 className="mr-1 inline h-3 w-3" />
                  Reviewed
                </>
              ) : (
                <>
                  <Clock className="mr-1 inline h-3 w-3" />
                  Pending
                </>
              )}
            </span>
          </div>
          <h3
            className="text-sm font-semibold text-foreground"
            title={deal.dealCaption}
          >
            {captionPreview}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            <Building2 className="mr-1 inline h-3 w-3" />
            {deal.brokerage}
            <span className="mx-1.5 text-border">·</span>
            {deal.dealType}
          </p>
        </div>
        {showActions && (
          <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    asChild
                  >
                    <Link href={editLink}>
                      <Edit className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Edit</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Delete</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-xs">
        <div>
          <span className="text-muted-foreground">Revenue</span>
          <p className="mt-0.5 font-medium tabular-nums text-foreground">
            {formatCurrency(deal.revenue)}
          </p>
        </div>
        <div>
          <span className="text-muted-foreground">EBITDA</span>
          <p className="mt-0.5 font-medium tabular-nums text-foreground">
            {formatCurrency(deal.ebitda)}
          </p>
        </div>
        <div>
          <span className="text-muted-foreground">Margin</span>
          <p className="mt-0.5 font-medium tabular-nums text-foreground">
            {formatPercent(ebitdaMargin)}
          </p>
        </div>
        {deal.askingPrice ? (
          <div>
            <span className="text-muted-foreground">Asking</span>
            <p className="mt-0.5 font-medium tabular-nums text-foreground">
              {formatCurrency(deal.askingPrice)}
            </p>
          </div>
        ) : null}
        <div className="col-span-2">
          <span className="text-muted-foreground">Industry</span>
          <p className="mt-0.5 text-foreground">
            {deal.industry || "—"}
          </p>
        </div>
        {deal.companyLocation && (
          <div className="col-span-2 flex items-start gap-1.5 text-muted-foreground">
            <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
            <span className="line-clamp-2">{deal.companyLocation}</span>
          </div>
        )}
      </div>

      <div className="mt-4 flex gap-2 border-t border-border pt-4">
        <Button size="sm" className="flex-1 gap-1.5" asChild>
          <Link href={detailLink}>
            <Eye className="h-3.5 w-3.5" />
            View
          </Link>
        </Button>
        {showScreenButton && (
          <Button variant="outline" size="sm" className="flex-1 gap-1.5" asChild>
            <Link href={screenLink}>
              <Zap className="h-3.5 w-3.5" />
              Screen
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
