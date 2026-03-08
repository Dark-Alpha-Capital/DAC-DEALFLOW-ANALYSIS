"use client";

import ThemeAnalytics from "@/components/ThemeAnalytics";
import ThemeCompaniesList from "@/components/ThemeCompaniesList";
import { formatDate } from "./utils";
import type { ThemeDetailTabProps } from "./types";

export function ThemeOverviewTab({
  theme,
  companyCount,
  dealOpportunityCount,
  activeIndustryIntelligence,
  latestPerformance,
  companies,
}: ThemeDetailTabProps) {
  return (
    <div className="space-y-6">
      <div className="border-border space-y-2 border-b pb-6">
        <h2 className="text-muted-foreground text-sm font-medium">
          Description
        </h2>
        <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">
          {theme.description}
        </p>
      </div>

      {(theme.capitalPriorityScore != null ||
        theme.confidenceScore != null) && (
        <div className="border-border space-y-3 border-b pb-6">
          <h2 className="text-muted-foreground text-sm font-medium">Scores</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {theme.capitalPriorityScore != null && (
              <div>
                <p className="text-muted-foreground text-xs">
                  Capital Priority Score
                </p>
                <p className="text-foreground font-medium tabular-nums">
                  {theme.capitalPriorityScore}
                </p>
              </div>
            )}
            {theme.confidenceScore != null && (
              <div>
                <p className="text-muted-foreground text-xs">
                  Confidence Score
                </p>
                <p className="text-foreground font-medium tabular-nums">
                  {theme.confidenceScore}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <ThemeAnalytics
        companyCount={companyCount}
        dealOpportunityCount={dealOpportunityCount}
        industryIntelligence={
          activeIndustryIntelligence && {
            tam: activeIndustryIntelligence.tam,
            growthRate: activeIndustryIntelligence.growthRate,
            avgEbitdaMargin: activeIndustryIntelligence.avgEbitdaMargin,
            avgEntryMultiple: activeIndustryIntelligence.avgEntryMultiple,
            avgExitMultiple: activeIndustryIntelligence.avgExitMultiple,
            fragmentationScore: activeIndustryIntelligence.fragmentationScore,
            sponsorPenetration: activeIndustryIntelligence.sponsorPenetration,
            cyclicalityScore: activeIndustryIntelligence.cyclicalityScore,
            disruptionRiskScore:
              activeIndustryIntelligence.disruptionRiskScore,
          }
        }
        performance={
          latestPerformance && {
            dealsSourced: latestPerformance.dealsSourced,
            meetingsHeld: latestPerformance.meetingsHeld,
            loisIssued: latestPerformance.loisIssued,
            dealsClosed: latestPerformance.dealsClosed,
            averageEntryMultiple: latestPerformance.averageEntryMultiple,
            averageIRR: latestPerformance.averageIRR,
          }
        }
      />
      <div className="border-border space-y-3 border-b pb-6">
        <h2 className="text-muted-foreground text-sm font-medium">
          Companies in theme
        </h2>
        <ThemeCompaniesList companies={companies} />
      </div>

      <p className="text-muted-foreground text-xs">
        Created {formatDate(theme.createdAt)}
      </p>
    </div>
  );
}
