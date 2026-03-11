"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

export type PipelineConversionDatum = {
  stage: string;
  count: number;
};

const chartConfig = {
  deals: {
    label: "Deal opportunities",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

const STAGE_LABELS: Record<string, string> = {
  LISTED: "Listed",
  INITIAL_REVIEW: "Initial review",
  SCREENED: "Screened",
  MEETING_HELD: "Meeting held",
  IOI_SUBMITTED: "IOI submitted",
  LOI_SUBMITTED: "LOI submitted",
  DILIGENCE: "Diligence",
  CLOSED: "Closed",
  DEAD: "Dead",
  UNKNOWN: "Unknown",
};

const STAGE_ORDER = [
  "LISTED",
  "INITIAL_REVIEW",
  "SCREENED",
  "MEETING_HELD",
  "IOI_SUBMITTED",
  "LOI_SUBMITTED",
  "DILIGENCE",
  "CLOSED",
  "DEAD",
  "UNKNOWN",
] as const;

interface PipelineConversionChartProps {
  data: PipelineConversionDatum[];
}

export function PipelineConversionChart({
  data,
}: PipelineConversionChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pipeline conversion</CardTitle>
          <CardDescription>No deal opportunities found.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const stageMap = new Map<string, number>();
  for (const row of data) {
    stageMap.set(row.stage, (stageMap.get(row.stage) ?? 0) + row.count);
  }

  const chartData = STAGE_ORDER.filter((id) => stageMap.get(id) ?? 0).map(
    (id) => ({
      stage: STAGE_LABELS[id] ?? id,
      rawStage: id,
      deals: stageMap.get(id) ?? 0,
    }),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pipeline conversion</CardTitle>
        <CardDescription>
          Distribution of opportunities across the investment funnel.
        </CardDescription>
      </CardHeader>
      <CardContent className="h-[260px]">
        <ChartContainer config={chartConfig} className="h-full w-full">
          <BarChart
            data={chartData}
            margin={{ left: 12, right: 16, top: 8, bottom: 24 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="stage"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis tickLine={false} axisLine={false} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  nameKey="stage"
                  labelFormatter={(_, payload) =>
                    payload?.[0]?.payload?.stage ?? ""
                  }
                />
              }
            />
            <Bar
              dataKey="deals"
              fill="var(--color-deals)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

