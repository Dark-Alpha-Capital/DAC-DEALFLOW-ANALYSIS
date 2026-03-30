
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

type PipelineData = {
  dealsByStage: Array<{ stage: string; count: number }>;
  leadFlow: Array<{ status: string; count: number }>;
  kpis: {
    newLeads: number;
    processedLeads: number;
    duplicates: number;
  };
};

type ThemeData = {
  activeThemes: number;
  companiesPerTheme: Array<{ themeId: string | null; themeName: string; count: number }>;
  dealsPerTheme: Array<{ themeId: string | null; themeName: string; count: number }>;
};

type TopDeal = {
  dealOpportunityId: string;
  companyName: string;
  themeName: string | null;
  stage: string;
  latestScore: number;
  latestScreenedAt: string;
};

export type GlobalDashboardProps = {
  pipeline: PipelineData;
  themes: ThemeData;
  topDeals: TopDeal[];
};

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <header className="space-y-1 border-b border-border/60 pb-4">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
    </header>
  );
}

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

function KpiStrip({ title, value }: { title: string; value: number }) {
  return (
    <section className="border border-border/70 bg-background px-5 py-4">
      <p className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
        {title}
      </p>
      <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">{value.toLocaleString()}</p>
    </section>
  );
}

function DealsByStage({ data }: { data: PipelineData["dealsByStage"] }) {
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

function LeadFlow({ data }: { data: PipelineData["leadFlow"] }) {
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

function TopDeals({ data }: { data: TopDeal[] }) {
  return (
    <SegmentedPanel title="Top Deals" description="Ranked by deterministic screening score.">
      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No scored deals found.</p>
      ) : (
        <Table className="border border-border/60">
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Rank</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Theme</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Screened</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, index) => (
              <TableRow key={row.dealOpportunityId}>
                <TableCell className="font-medium">#{index + 1}</TableCell>
                <TableCell>
                  <Link to={`/deal-opportunities/${row.dealOpportunityId}`} className="hover:underline">
                    {row.companyName}
                  </Link>
                </TableCell>
                <TableCell>{row.themeName ?? "Unassigned"}</TableCell>
                <TableCell>{STAGE_LABELS[row.stage] ?? row.stage}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{row.latestScore}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(row.latestScreenedAt).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </SegmentedPanel>
  );
}

export function GlobalDashboard({ pipeline, themes, topDeals }: GlobalDashboardProps) {
  return (
    <Tabs defaultValue="pipeline" className="space-y-5">
      <TabsList className="h-auto rounded-none border-b border-border/70 bg-transparent p-0">
        <TabsTrigger
          value="pipeline"
          className="rounded-none border-b-2 border-transparent px-4 py-3 text-xs tracking-[0.12em] uppercase data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none"
        >
          Pipeline
        </TabsTrigger>
        <TabsTrigger
          value="themes"
          className="rounded-none border-b-2 border-transparent px-4 py-3 text-xs tracking-[0.12em] uppercase data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none"
        >
          Investment themes
        </TabsTrigger>
        <TabsTrigger
          value="deals"
          className="rounded-none border-b-2 border-transparent px-4 py-3 text-xs tracking-[0.12em] uppercase data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none"
        >
          Deals
        </TabsTrigger>
      </TabsList>

      <TabsContent value="pipeline" className="mt-0 space-y-4">
        <SectionHeader
          title="Pipeline"
          description="Stage distribution, lead status funnel, and lead KPIs."
        />
        <div className="grid gap-3 md:grid-cols-3">
          <KpiStrip title="New Leads" value={pipeline.kpis.newLeads} />
          <KpiStrip title="Processed Leads" value={pipeline.kpis.processedLeads} />
          <KpiStrip title="Duplicates" value={pipeline.kpis.duplicates} />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <DealsByStage data={pipeline.dealsByStage} />
          <LeadFlow data={pipeline.leadFlow} />
        </div>
      </TabsContent>

      <TabsContent value="themes" className="mt-0 space-y-4">
        <SectionHeader
          title="Investment themes"
          description="Investment theme coverage and concentration across companies and opportunities."
        />
        <div className="grid gap-3 md:grid-cols-3">
          <KpiStrip title="Active investment themes" value={themes.activeThemes} />
        </div>
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
      </TabsContent>

      <TabsContent value="deals" className="mt-0 space-y-4">
        <SectionHeader
          title="Deal opportunities"
          description="Top opportunities ranked by deterministic screening score."
        />
        <TopDeals data={topDeals} />
      </TabsContent>
    </Tabs>
  );
}
