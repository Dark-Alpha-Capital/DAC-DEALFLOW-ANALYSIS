
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
  stageLabel?: string;
};

const chartConfig = {
  deals: {
    label: "Deal opportunities",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

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

  const chartData = data.map((row) => ({
    stage: row.stageLabel ?? row.stage,
    deals: row.count,
  }));

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

