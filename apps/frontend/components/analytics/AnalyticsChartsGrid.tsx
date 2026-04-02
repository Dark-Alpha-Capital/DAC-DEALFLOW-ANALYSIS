import type { ComponentProps } from "react";
import { ThemePerformanceChart } from "./ThemePerformanceChart";
import { PipelineConversionChart } from "./PipelineConversionChart";
import { LeadSourceChart } from "./LeadSourceChart";
import { ScreeningScoresChart } from "./ScreeningScoresChart";

export function AnalyticsChartsGrid({
  dealsByTheme,
  pipelineConversion,
  sourcePerformance,
  screeningScores,
}: {
  dealsByTheme: ComponentProps<typeof ThemePerformanceChart>["data"];
  pipelineConversion: ComponentProps<typeof PipelineConversionChart>["data"];
  sourcePerformance: ComponentProps<typeof LeadSourceChart>["data"];
  screeningScores: ComponentProps<typeof ScreeningScoresChart>["data"];
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ThemePerformanceChart data={dealsByTheme} />
      <PipelineConversionChart data={pipelineConversion} />
      <LeadSourceChart data={sourcePerformance} />
      <ScreeningScoresChart data={screeningScores} />
    </div>
  );
}
