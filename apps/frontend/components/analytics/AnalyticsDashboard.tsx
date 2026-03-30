
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { ThemePerformanceChart } from "./ThemePerformanceChart";
import { PipelineConversionChart } from "./PipelineConversionChart";
import { LeadSourceChart } from "./LeadSourceChart";
import { ScreeningScoresChart } from "./ScreeningScoresChart";

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
    <div className="grid gap-6 lg:grid-cols-2">
      <ThemePerformanceChart data={dealsByTheme} />
      <PipelineConversionChart data={pipelineConversion} />
      <LeadSourceChart data={sourcePerformance} />
      <ScreeningScoresChart data={screeningScores} />
    </div>
  );
}

