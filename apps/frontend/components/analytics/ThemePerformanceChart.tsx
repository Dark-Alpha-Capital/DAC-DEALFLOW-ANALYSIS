
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

export type DealsByThemeDatum = {
  themeId: string | null;
  themeName: string;
  count: number;
};

const chartConfig = {
  deals: {
    label: "Deal opportunities",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

interface ThemePerformanceChartProps {
  data: DealsByThemeDatum[];
}

export function ThemePerformanceChart({ data }: ThemePerformanceChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Deal opportunities by theme</CardTitle>
          <CardDescription>No deal opportunities found.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const chartData = data.map((row) => ({
    themeName: row.themeName,
    deals: row.count,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Deal opportunities by theme</CardTitle>
        <CardDescription>
          Distribution of deal opportunities across investment themes.
        </CardDescription>
      </CardHeader>
      <CardContent className="h-[260px]">
        <ChartContainer config={chartConfig} className="h-full w-full">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ left: 80, right: 16, top: 8, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} />
            <XAxis type="number" tickLine={false} axisLine={false} />
            <YAxis
              type="category"
              dataKey="themeName"
              tickLine={false}
              axisLine={false}
              width={120}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  nameKey="themeName"
                  labelFormatter={(_, payload) =>
                    payload?.[0]?.payload?.themeName ?? ""
                  }
                />
              }
            />
            <Bar
              dataKey="deals"
              fill="var(--color-deals)"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

