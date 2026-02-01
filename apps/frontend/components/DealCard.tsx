"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  ExternalLink,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Deal } from "db";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  calculateEbitdaMargin,
  formatCurrency,
  formatPercent,
} from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

const DealCard = ({
  deal,
  className,
  showActions = true,
  showScreenButton = true,
}: {
  deal: Deal;
  className?: string;
  showActions?: boolean;
  showScreenButton?: boolean;
}) => {
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

  return (
    <Card
      className={cn(
        "group relative flex h-full cursor-pointer flex-col overflow-hidden border-border/50 bg-gradient-to-br from-card to-card/80 transition-all duration-200 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5",
        className,
      )}
    >
      {/* Accent line */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-primary/80 to-primary/60 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

      <CardHeader className="space-y-3 pb-2">
        {/* Top row: Status badges + Actions */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            <Badge
              variant={deal.isPublished ? "default" : "secondary"}
              className={cn(
                "text-xs font-medium",
                deal.isPublished
                  ? "bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {deal.isPublished ? (
                <CheckCircle2 className="mr-1 h-3 w-3" />
              ) : null}
              {deal.isPublished ? "Published" : "Draft"}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                "text-xs font-medium",
                deal.isReviewed
                  ? "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
              )}
            >
              {deal.isReviewed ? (
                <CheckCircle2 className="mr-1 h-3 w-3" />
              ) : (
                <Clock className="mr-1 h-3 w-3" />
              )}
              {deal.isReviewed ? "Reviewed" : "Pending"}
            </Badge>
          </div>

          {showActions && (
            <div className="flex gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                      asChild
                    >
                      <Link href={editLink}>
                        <Edit className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    Edit Deal
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      onClick={handleDelete}
                      disabled={isDeleting}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    Delete Deal
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </div>

        {/* Title */}
        <h3 className="line-clamp-2 text-base font-semibold leading-snug tracking-tight text-foreground transition-colors duration-200 group-hover:text-primary">
          {deal.dealCaption}
        </h3>

        {/* Brokerage + Deal Type */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-primary/70" />
            <span className="font-medium text-foreground/80">
              {deal.brokerage}
            </span>
          </span>
          <span className="text-border">•</span>
          <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-medium">
            {deal.dealType}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-4 pt-2">
        {/* Key Financial Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <MetricCard
            label="Revenue"
            value={formatCurrency(deal.revenue)}
            icon={<DollarSign className="h-4 w-4" />}
            variant="success"
          />
          <MetricCard
            label="EBITDA"
            value={formatCurrency(deal.ebitda)}
            icon={<TrendingUp className="h-4 w-4" />}
            variant="info"
          />
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <InfoRow
            label="Margin"
            value={formatPercent(ebitdaMargin)}
            highlight={ebitdaMargin > 20}
          />
          {deal.askingPrice && (
            <InfoRow
              label="Asking"
              value={formatCurrency(deal.askingPrice)}
            />
          )}
          <InfoRow
            label="Industry"
            value={deal.industry || "—"}
            icon={<Briefcase className="h-3 w-3" />}
          />
          <InfoRow label="Status" value={deal.status} />
        </div>

        {/* Location */}
        {deal.companyLocation && (
          <div className="flex items-start gap-1.5 rounded-md bg-muted/50 px-2.5 py-2 text-xs text-muted-foreground">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/60" />
            <span className="line-clamp-2">{deal.companyLocation}</span>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex gap-2 border-t border-border/50 bg-muted/30 px-4 py-3">
        <Button
          className="flex-1 gap-1.5 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
          size="sm"
          asChild
        >
          <Link href={detailLink}>
            <Eye className="h-3.5 w-3.5" />
            View Details
          </Link>
        </Button>

        {showScreenButton && (
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5 border-primary/20 hover:border-primary/40 hover:bg-primary/5"
            asChild
          >
            <Link href={screenLink}>
              <Zap className="h-3.5 w-3.5" />
              Screen
            </Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

const MetricCard = ({
  label,
  value,
  icon,
  variant = "default",
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  variant?: "default" | "success" | "info" | "warning";
}) => {
  const variantStyles = {
    default: "bg-muted/50 text-foreground",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    info: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  };

  const iconStyles = {
    default: "text-muted-foreground",
    success: "text-emerald-500/70",
    info: "text-sky-500/70",
    warning: "text-amber-500/70",
  };

  return (
    <div
      className={cn(
        "rounded-lg px-3 py-2.5 transition-colors duration-200",
        variantStyles[variant],
      )}
    >
      <div className="flex items-center gap-1.5">
        <span className={iconStyles[variant]}>{icon}</span>
        <span className="text-[10px] font-medium uppercase tracking-wider opacity-70">
          {label}
        </span>
      </div>
      <p className="mt-0.5 text-lg font-bold tabular-nums tracking-tight">
        {value}
      </p>
    </div>
  );
};

const InfoRow = ({
  label,
  value,
  icon,
  highlight = false,
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  highlight?: boolean;
}) => (
  <div className="flex items-center justify-between gap-2">
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      {icon}
      {label}
    </span>
    <span
      className={cn(
        "truncate text-xs font-medium",
        highlight
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-foreground/80",
      )}
    >
      {value}
    </span>
  </div>
);

export default DealCard;
