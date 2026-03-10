"use client";

import React from "react";
import Link from "next/link";
import type { Deal } from "@repo/db";
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
  User,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

interface Props {
  deal: Deal;
  selected: boolean;
  onToggle: () => void;
}

export default function DealListItem({ deal, selected, onToggle }: Props) {
  const fullCaption = deal.title || deal.dealCaption;
  const words = fullCaption.trim().split(/\s+/);
  const captionPreview =
    words.length > 5 ? words.slice(0, 5).join(" ") + "..." : fullCaption;

  return (
    <div
      className={cn(
        "group flex items-center gap-6 border-b border-border bg-background px-4 py-4 transition-colors hover:bg-muted/40",
        selected && "bg-muted/60",
      )}
    >
      <div className="flex items-center pt-0.5">
        <Checkbox
          checked={selected}
          onCheckedChange={onToggle}
          className="h-4 w-4 border-border data-[state=checked]:border-primary data-[state=checked]:bg-primary"
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3
            className="text-sm font-semibold text-foreground"
            title={fullCaption}
          >
            {captionPreview}
          </h3>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              {deal.reviewState === "PUBLISHED" && (
                <CheckCircle2 className="mr-1 inline h-3 w-3" />
              )}
              {deal.reviewState === "PUBLISHED" ? "Published" : "Draft"}
            </span>
            <span className="text-border">·</span>
            <span>
              {(deal.reviewState === "REVIEWED" ||
                deal.reviewState === "PUBLISHED") ? (
                <CheckCircle2 className="mr-1 inline h-3 w-3" />
              ) : (
                <Clock className="mr-1 inline h-3 w-3" />
              )}
              {deal.reviewState === "REVIEWED" || deal.reviewState === "PUBLISHED"
                ? "Reviewed"
                : "Pending"}
            </span>
          </div>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          <Building2 className="mr-1 inline h-3 w-3" />
          {deal.brokerage}
          {deal.companyLocation && (
            <>
              <span className="mx-1.5 text-border">·</span>
              <MapPin className="mr-1 inline h-3 w-3" />
              <span className="truncate max-w-[180px] align-middle">
                {deal.companyLocation}
              </span>
            </>
          )}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-muted-foreground">
          <span>Revenue {formatCurrency(deal.revenue)}</span>
          <span>EBITDA {formatCurrency(deal.ebitda)}</span>
          {deal.industry && <span>{deal.industry}</span>}
          {(deal.firstName || deal.lastName) && (
            <span>
              <User className="mr-1 inline h-3 w-3" />
              {deal.firstName} {deal.lastName}
            </span>
          )}
          {deal.email && (
            <a
              href={`mailto:${deal.email}`}
              className="hover:text-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              <Mail className="mr-1 inline h-3 w-3" />
              <span className="max-w-[140px] truncate align-middle">
                {deal.email}
              </span>
            </a>
          )}
          {deal.workPhone && (
            <a
              href={`tel:${deal.workPhone}`}
              className="hover:text-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              <Phone className="mr-1 inline h-3 w-3" />
              {deal.workPhone}
            </a>
          )}
          {deal.linkedinUrl && (
            <a
              href={deal.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              <Linkedin className="inline h-3 w-3" />
            </a>
          )}
        </div>
      </div>

      <div className="shrink-0">
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs" asChild>
          <Link href={`/raw-deals/${deal.id}`}>
            View
            <ExternalLink className="h-3 w-3" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
