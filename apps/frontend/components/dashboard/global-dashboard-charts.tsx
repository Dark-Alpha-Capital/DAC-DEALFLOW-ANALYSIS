import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { ReactNode } from "react";

const STAGE_LABELS: Record<string, string> = {
  LISTED: "Listed",
  INITIAL_REVIEW: "Initial Review",
  SCREENED: "Screened",
  MEETING_HELD: "Meeting Held",
  IOI_SUBMITTED: "IOI Submitted",
  LOI_SUBMITTED: "LOI Submitted",
  DILIGENCE: "Diligence",
  CLOSED: "Closed",
  DEAD: "Dead",
  UNKNOWN: "Unknown",
};

const LEAD_STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  PROCESSED: "Processed",
  DUPLICATE: "Duplicate",
  REJECTED: "Rejected",
  UNKNOWN: "Unknown",
};

const barConfig = {
  count: {
    label: "Count",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

const leadFlowConfig = {
  count: {
    label: "Leads",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

const stageOrder = [
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

const leadStatusOrder = ["NEW", "PROCESSED", "DUPLICATE", "REJECTED", "UNKNOWN"] as const;

type PipelineSlice = {
  dealsByStage: Array<{ stage: string; count: number }>;
  leadFlow: Array<{ status: string; count: number }>;
};

type ThemeSlice = {
  companiesPerTheme: Array<{ themeId: string | null; themeName: string; count: number }>;
  dealsPerTheme: Array<{ themeId: string | null; themeName: string; count: number }>;
};

function SegmentedPanel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="border border-border/70 bg-background">
      <div className="border-b border-border/70 px-5 py-4">
        <h3 className="text-sm font-semibold tracking-wide uppercase">{title}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="px-4 py-4 sm:px-5">{children}</div>
    </section>
  );
}

function DealsByStage({ data }: { data: PipelineSlice["dealsByStage"] }) {
  const chartData = stageOrder
    .map((stage) => ({
      stage: STAGE_LABELS[stage] ?? stage,
      count: data.find((row) => row.stage === stage)?.count ?? 0,
    }))
    .filter((row) => row.count > 0);

  return (
    <SegmentedPanel
      title="Deals by Stage"
      description="Opportunity distribution across pipeline stages."
    >
      <div className="h-[280px]">
        <ChartContainer config={barConfig} className="h-full w-full">
          <BarChart data={chartData} margin={{ left: 12, right: 12, top: 8, bottom: 28 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="stage" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis tickLine={false} axisLine={false} />
            <ChartTooltip
              content={<ChartTooltipContent labelFormatter={(v) => String(v)} nameKey="stage" />}
            />
            <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </div>
    </SegmentedPanel>
  );
}

function LeadFlow({ data }: { data: PipelineSlice["leadFlow"] }) {
  const chartData = leadStatusOrder.map((status) => ({
    status: LEAD_STATUS_LABELS[status] ?? status,
    count: data.find((row) => row.status === status)?.count ?? 0,
  }));

  return (
    <SegmentedPanel
      title="Lead Flow"
      description="Lead status funnel across intake and processing."
    >
      <div className="h-[280px]">
        <ChartContainer config={leadFlowConfig} className="h-full w-full">
          <BarChart data={chartData} margin={{ left: 12, right: 12, top: 8, bottom: 24 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="status" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis tickLine={false} axisLine={false} />
            <ChartTooltip
              content={<ChartTooltipContent labelFormatter={(v) => String(v)} nameKey="status" />}
            />
            <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </div>
    </SegmentedPanel>
  );
}

function ThemeChart({
  title,
  description,
  data,
}: {
  title: string;
  description: string;
  data: Array<{ themeName: string; count: number }>;
}) {
  const chartData = data.map((row) => ({
    label: row.themeName,
    count: row.count,
  }));

  return (
    <SegmentedPanel title={title} description={description}>
      <div className="h-[340px]">
        <ChartContainer config={barConfig} className="h-full w-full">
          <BarChart data={chartData} layout="vertical" margin={{ left: 70, right: 16, top: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} />
            <XAxis type="number" tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="label" tickLine={false} axisLine={false} width={120} />
            <ChartTooltip
              content={<ChartTooltipContent labelFormatter={(_, p) => p?.[0]?.payload?.label ?? ""} />}
            />
            <Bar dataKey="count" fill="var(--color-count)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ChartContainer>
      </div>
    </SegmentedPanel>
  );
}

export function GlobalDashboardPipelineCharts({ pipeline }: { pipeline: PipelineSlice }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <DealsByStage data={pipeline.dealsByStage} />
      <LeadFlow data={pipeline.leadFlow} />
    </div>
  );
}

export function GlobalDashboardThemeCharts({ themes }: { themes: ThemeSlice }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ThemeChart
        title="Companies per investment theme"
        description="Company concentration across strategic investment themes."
        data={themes.companiesPerTheme}
      />
      <ThemeChart
        title="Deals per investment theme"
        description="Deal opportunity concentration across investment themes."
        data={themes.dealsPerTheme}
      />
    </div>
  );
}
