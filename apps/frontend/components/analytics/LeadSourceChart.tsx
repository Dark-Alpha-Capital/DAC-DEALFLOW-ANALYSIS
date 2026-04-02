
import { Bar, BarChart, CartesianGrid, Legend, XAxis, YAxis } from "recharts";
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

export type SourcePerformanceDatum = {
  source: string;
  leads: number;
  deals: number;
};

const chartConfig = {
  leads: {
    label: "Leads",
    color: "var(--chart-3)",
  },
  deals: {
    label: "Deal opportunities",
    color: "var(--chart-4)",
  },
} satisfies ChartConfig;

interface LeadSourceChartProps {
  data: SourcePerformanceDatum[];
}

export function LeadSourceChart({ data }: LeadSourceChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Source performance</CardTitle>
          <CardDescription>No lead or deal sources found.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const chartData = data.map((row) => ({
    source: row.source,
    leads: row.leads,
    deals: row.deals,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Source performance</CardTitle>
        <CardDescription>
          Lead volume and converted opportunities by source.
        </CardDescription>
      </CardHeader>
      <CardContent className="h-[260px]">
        <ChartContainer config={chartConfig} className="h-full w-full">
          <BarChart
            data={chartData}
            margin={{ left: 12, right: 16, top: 8, bottom: 32 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="source"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis tickLine={false} axisLine={false} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  nameKey="source"
                  labelFormatter={(value) => String(value)}
                />
              }
            />
            <Legend />
            <Bar
              dataKey="leads"
              fill="var(--color-leads)"
              radius={[4, 4, 0, 0]}
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

