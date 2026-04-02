import { ClientOnly } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { AnalyticsChartsGrid } from "./AnalyticsChartsGrid";

export function AnalyticsDashboard() {
  const trpc = useTRPC();

  const {
    data: dealsByTheme = [],
    isLoading: loadingThemes,
  } = useQuery(trpc.analytics.dealsByTheme.queryOptions());

  const {
    data: pipelineConversion = [],
    isLoading: loadingPipeline,
  } = useQuery(trpc.analytics.pipelineConversion.queryOptions());

  const {
    data: sourcePerformance = [],
    isLoading: loadingSources,
  } = useQuery(trpc.analytics.sourcePerformance.queryOptions());

  const {
    data: screeningScores = [],
    isLoading: loadingScores,
  } = useQuery(trpc.analytics.screeningScores.queryOptions());

  const isInitialLoading =
    loadingThemes && loadingPipeline && loadingSources && loadingScores;

  if (isInitialLoading) {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-[260px] rounded-xl border bg-muted/40" />
        <div className="h-[260px] rounded-xl border bg-muted/40" />
        <div className="h-[260px] rounded-xl border bg-muted/40" />
        <div className="h-[260px] rounded-xl border bg-muted/40" />
      </div>
    );
  }

  return (
    <ClientOnly
      fallback={
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-[260px] rounded-xl border bg-muted/40" />
          <div className="h-[260px] rounded-xl border bg-muted/40" />
          <div className="h-[260px] rounded-xl border bg-muted/40" />
          <div className="h-[260px] rounded-xl border bg-muted/40" />
        </div>
      }
    >
      <AnalyticsChartsGrid
        dealsByTheme={dealsByTheme}
        pipelineConversion={pipelineConversion}
        sourcePerformance={sourcePerformance}
        screeningScores={screeningScores}
      />
    </ClientOnly>
  );
}

