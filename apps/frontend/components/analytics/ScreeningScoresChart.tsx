
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

export type ScreeningScoreDatum = {
  bucket: string;
  id?: string;
  count: number;
};

const chartConfig = {
  screenings: {
    label: "Screenings",
    color: "var(--chart-5)",
  },
} satisfies ChartConfig;

interface ScreeningScoresChartProps {
  data: ScreeningScoreDatum[];
}

export function ScreeningScoresChart({ data }: ScreeningScoresChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Screening scores</CardTitle>
          <CardDescription>No AI screenings with scores found.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const chartData = data.map((row) => ({
    bucket: row.bucket,
    count: row.count,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Screening scores</CardTitle>
        <CardDescription>
          Distribution of AI screening scores across buckets.
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
              dataKey="bucket"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis tickLine={false} axisLine={false} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  nameKey="bucket"
                  labelFormatter={(value) => String(value)}
                />
              }
            />
            <Bar
              dataKey="count"
              fill="var(--color-screenings)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

