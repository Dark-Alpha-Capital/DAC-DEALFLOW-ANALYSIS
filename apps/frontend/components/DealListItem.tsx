"use client";

import React from "react";
import Link from "next/link";
import type { Deal } from "db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Building2,
  Mail,
  Phone,
  Linkedin,
  MapPin,
  CheckCircle2,
  Clock,
  ExternalLink,
  TrendingUp,
  DollarSign,
  Briefcase,
  User,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

interface Props {
  deal: Deal;
  selected: boolean;
  onToggle: () => void;
}

export default function DealListItem({ deal, selected, onToggle }: Props) {
  return (
    <div
      className={cn(
        "group relative flex items-stretch gap-4 border-b border-border/50 bg-card px-4 py-4 transition-all duration-200 hover:bg-muted/30",
        selected && "bg-primary/5 hover:bg-primary/10",
      )}
    >
      {/* Selection indicator */}
      <div
        className={cn(
          "absolute inset-y-0 left-0 w-0.5 bg-primary transition-all duration-200",
          selected ? "opacity-100" : "opacity-0 group-hover:opacity-50",
        )}
      />

      {/* Checkbox */}
      <div className="flex items-center pt-1">
        <Checkbox
          checked={selected}
          onCheckedChange={onToggle}
          className="h-4.5 w-4.5 border-muted-foreground/30 data-[state=checked]:border-primary data-[state=checked]:bg-primary"
        />
      </div>

      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        {/* Header: Title + Status Badges */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground transition-colors duration-200 group-hover:text-primary">
              {deal.title || deal.dealCaption}
            </h3>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3 text-primary/60" />
                <span className="font-medium text-foreground/70">
                  {deal.brokerage}
                </span>
              </span>
              {deal.companyLocation && (
                <>
                  <span className="text-border">•</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate max-w-[150px]">
                      {deal.companyLocation}
                    </span>
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Status Badges */}
          <div className="flex shrink-0 gap-1.5">
            <Badge
              variant={deal.isPublished ? "default" : "secondary"}
              className={cn(
                "h-6 px-2 text-[10px] font-medium",
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
                "h-6 px-2 text-[10px] font-medium",
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
        </div>

        {/* Middle: Key Metrics + Contact Info */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {/* Financial Metrics */}
          <div className="flex items-center gap-4">
            <MetricPill
              icon={<DollarSign className="h-3.5 w-3.5" />}
              label="Revenue"
              value={formatCurrency(deal.revenue)}
              variant="success"
            />
            <MetricPill
              icon={<TrendingUp className="h-3.5 w-3.5" />}
              label="EBITDA"
              value={formatCurrency(deal.ebitda)}
              variant="info"
            />
            {deal.industry && (
              <MetricPill
                icon={<Briefcase className="h-3.5 w-3.5" />}
                label="Industry"
                value={deal.industry}
                variant="default"
              />
            )}
          </div>

          {/* Contact Info */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {(deal.firstName || deal.lastName) && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span>
                  {deal.firstName} {deal.lastName}
                </span>
              </span>
            )}
            {deal.email && (
              <a
                href={`mailto:${deal.email}`}
                className="flex items-center gap-1 transition-colors hover:text-primary"
                onClick={(e) => e.stopPropagation()}
              >
                <Mail className="h-3 w-3" />
                <span className="max-w-[120px] truncate">{deal.email}</span>
              </a>
            )}
            {deal.workPhone && (
              <a
                href={`tel:${deal.workPhone}`}
                className="flex items-center gap-1 transition-colors hover:text-primary"
                onClick={(e) => e.stopPropagation()}
              >
                <Phone className="h-3 w-3" />
                <span>{deal.workPhone}</span>
              </a>
            )}
            {deal.linkedinUrl && (
              <a
                href={deal.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 transition-colors hover:text-primary"
                onClick={(e) => e.stopPropagation()}
              >
                <Linkedin className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="flex shrink-0 items-center">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 border-border/60 px-3 text-xs font-medium opacity-70 transition-all duration-200 hover:border-primary/40 hover:bg-primary/5 hover:text-primary hover:opacity-100 group-hover:opacity-100"
          asChild
        >
          <Link href={`/raw-deals/${deal.id}`}>
            View
            <ExternalLink className="h-3 w-3" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

const MetricPill = ({
  icon,
  label,
  value,
  variant = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  variant?: "default" | "success" | "info";
}) => {
  const styles = {
    default: "bg-muted/60 text-foreground/80",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    info: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  };

  const iconStyles = {
    default: "text-muted-foreground",
    success: "text-emerald-500/70",
    info: "text-sky-500/70",
  };

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs",
        styles[variant],
      )}
    >
      <span className={iconStyles[variant]}>{icon}</span>
      <span className="font-medium opacity-60">{label}:</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
};
