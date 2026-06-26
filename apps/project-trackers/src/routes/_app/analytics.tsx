import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/analytics")({
  head: () => ({
    meta: [{ title: "Analytics — Dark Alpha Capital" }],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  return (
    <section className="block-space-mini container max-w-5xl">
      <h1 className="text-2xl font-bold md:text-3xl mb-6">Analytics</h1>
      <AnalyticsDashboard />
    </section>
  );
}

import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { PROJECT_STAGE_LABELS, type ProjectStageValue } from "@repo/enums";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { PROJECT_STAGE_VALUES } from "@repo/enums";
import { Loader2 } from "lucide-react";

const chartConfig = {
  value: { label: "Count" },
};

function KpiCard({ title, value, subtitle }: { title: string; value: string | number; subtitle?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription className="text-xs">{title}</CardDescription>
        <CardTitle className="text-2xl font-bold tabular-nums">{value}</CardTitle>
        {subtitle && <p className="text-muted-foreground text-xs">{subtitle}</p>}
      </CardHeader>
    </Card>
  );
}

function AnalyticsDashboard() {
  const trpc = useTRPC();

  const { data: overview, isLoading: overviewLoading } = useQuery(trpc.analytics.overview.queryOptions());
  const { data: projectsByStage = [] } = useQuery(trpc.analytics.projectsByStage.queryOptions());
  const { data: projectsByDept = [] } = useQuery(trpc.analytics.projectsByDepartment.queryOptions());
  const { data: workItemsByStatus = [] } = useQuery(trpc.analytics.workItemsByStatus.queryOptions());
  const { data: scoreDist = [] } = useQuery(trpc.analytics.screeningScoreDistribution.queryOptions());
  const { data: recentActivity = [] } = useQuery(trpc.analytics.recentActivity.queryOptions());

  if (overviewLoading) {
    return (
      <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground justify-center">
        <Loader2 className="size-4 animate-spin" />Loading analytics…
      </div>
    );
  }

  const stageData = PROJECT_STAGE_VALUES.map((stage) => {
    const entry = projectsByStage.find((s: any) => s.stage === stage);
    return { stage: PROJECT_STAGE_LABELS[stage], count: entry?.count ?? 0 };
  });

  const deptData = (projectsByDept as any[])
    .sort((a: any, b: any) => b.count - a.count)
    .slice(0, 10);

  const statusData = (workItemsByStatus as any[]);

  const scoreData = (scoreDist as any[]);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard title="Active projects" value={overview?.activeProjects ?? 0} />
        <KpiCard title="Total work items" value={overview?.totalWorkItems ?? 0} />
        <KpiCard title="Completed" value={overview?.completedWorkItems ?? 0} subtitle={`${overview?.overdueWorkItems ?? 0} overdue`} />
        <KpiCard title="Avg screening score" value={overview?.avgScreeningScore?.toFixed(1) ?? "—"} subtitle="Out of 5" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Projects by stage</CardTitle>
          </CardHeader>
          <CardContent className="h-[260px]">
            {stageData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stageData} layout="vertical" margin={{ top: 0, right: 20, left: 80, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="stage" tick={{ fontSize: 12 }} width={80} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--primary)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-sm">No data yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Projects by department</CardTitle>
          </CardHeader>
          <CardContent className="h-[260px]">
            {deptData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptData} layout="vertical" margin={{ top: 0, right: 20, left: 150, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="department" tick={{ fontSize: 12 }} width={140} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--primary)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-sm">No data yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Work items by status</CardTitle>
          </CardHeader>
          <CardContent className="h-[200px]">
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusData} margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="status" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-sm">No data yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Screening score distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-[200px]">
            {scoreData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scoreData} margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-sm">No screening data yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {recentActivity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Recent activity</CardTitle>
            <CardDescription>Latest stage changes across all projects.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {(recentActivity as any[]).slice(0, 15).map((event: any) => (
                <div key={event.id} className="flex items-center justify-between gap-2 py-1.5">
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="outline" className="text-xs">{event.from ?? "—"}</Badge>
                    <span className="text-muted-foreground">→</span>
                    <Badge variant="secondary" className="text-xs">{event.to}</Badge>
                    {event.note && <span className="text-muted-foreground text-xs">{event.note}</span>}
                  </div>
                  <span className="text-muted-foreground text-xs shrink-0">
                    {new Date(event.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
