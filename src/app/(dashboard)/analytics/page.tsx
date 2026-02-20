"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, BarChart3, PieChart, Activity, Brain, BookOpen } from "lucide-react";
import { buildClientApiHeaders } from "@/lib/client-config";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface AnalyticsData {
  weeklyContent: { week: string; platform: string; count: number }[];
  statusCounts: { status: string; count: number }[];
  platformCounts: { platform: string; count: number }[];
  pillarDistribution: { name: string; count: number }[];
  pillarTargets: { name: string; targetRatio: number }[];
  learnings: number;
  knowledgeDocs: number;
  weeklyUsage: { week: string; totalCost: number; totalTokens: number }[];
}

const COLORS = [
  "#8b5cf6", "#ec4899", "#3b82f6", "#10b981", "#f59e0b",
  "#ef4444", "#6366f1", "#14b8a6",
];

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  pending_approval: "Pending",
  approved: "Approved",
  scheduled: "Scheduled",
  published: "Published",
  scored: "Scored",
  archived: "Archived",
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await fetch("/api/analytics", {
          headers: buildClientApiHeaders(),
        });
        if (res.ok) {
          setData(await res.json());
        }
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Analytics</h2>
          <p className="text-muted-foreground">
            Track performance across all your marketing channels.
          </p>
        </div>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Analytics</h2>
          <p className="text-muted-foreground">
            Track performance across all your marketing channels.
          </p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BarChart3 className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">No analytics data</h3>
            <p className="text-sm text-muted-foreground">
              Create some content to see analytics.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Aggregate weekly content for bar chart
  const weeklyMap = new Map<string, Record<string, number>>();
  for (const entry of data.weeklyContent) {
    const weekLabel = new Date(entry.week).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    if (!weeklyMap.has(weekLabel)) weeklyMap.set(weekLabel, {});
    const rec = weeklyMap.get(weekLabel)!;
    rec[entry.platform] = (rec[entry.platform] || 0) + entry.count;
  }
  const weeklyChartData = Array.from(weeklyMap.entries()).map(
    ([week, platforms]) => ({
      week,
      ...platforms,
    })
  );

  const platforms = [...new Set(data.weeklyContent.map((w) => w.platform))];

  // Pipeline funnel data
  const funnelOrder = ["draft", "pending_approval", "approved", "scheduled", "published"];
  const funnelData = funnelOrder
    .map((status) => ({
      status: STATUS_LABELS[status] || status,
      count: data.statusCounts.find((s) => s.status === status)?.count || 0,
    }))
    .filter((d) => d.count > 0);

  // Pillar distribution with targets
  const pillarChartData = data.pillarDistribution.map((p) => {
    const target = data.pillarTargets.find((t) => t.name === p.name);
    return {
      ...p,
      targetRatio: target?.targetRatio ?? 0,
    };
  });

  const totalContent = data.pillarDistribution.reduce(
    (sum, p) => sum + p.count,
    0
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl md:text-2xl font-bold tracking-tight">Analytics</h2>
        <p className="text-sm md:text-base text-muted-foreground">
          Track performance across all your marketing channels.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Content</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalContent}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Platforms</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.platformCounts.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Learnings</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.learnings}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Knowledge Docs</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.knowledgeDocs}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Content velocity */}
        <Card>
          <CardHeader>
            <CardTitle>Content Velocity</CardTitle>
            <CardDescription>Content created per week by platform</CardDescription>
          </CardHeader>
          <CardContent>
            {weeklyChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={weeklyChartData}>
                  <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  {platforms.map((p, i) => (
                    <Bar
                      key={p}
                      dataKey={p}
                      stackId="a"
                      fill={COLORS[i % COLORS.length]}
                      name={p}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No content data yet
              </p>
            )}
          </CardContent>
        </Card>

        {/* Pipeline funnel */}
        <Card>
          <CardHeader>
            <CardTitle>Pipeline Funnel</CardTitle>
            <CardDescription>Content by status</CardDescription>
          </CardHeader>
          <CardContent>
            {funnelData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={funnelData} layout="vertical">
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis dataKey="status" type="category" tick={{ fontSize: 12 }} width={80} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No pipeline data yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Pillar balance */}
        <Card>
          <CardHeader>
            <CardTitle>Pillar Balance</CardTitle>
            <CardDescription>
              Actual distribution vs target ratios
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pillarChartData.length > 0 ? (
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={250}>
                  <RechartsPieChart>
                    <Pie
                      data={pillarChartData}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={(props) =>
                        `${props.name ?? ""} ${(((props.percent as number) ?? 0) * 100).toFixed(0)}%`
                      }
                    >
                      {pillarChartData.map((_, i) => (
                        <Cell
                          key={i}
                          fill={COLORS[i % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {pillarChartData.map((p, i) => {
                    const actualPct =
                      totalContent > 0
                        ? Math.round((p.count / totalContent) * 100)
                        : 0;
                    const diff = actualPct - p.targetRatio;
                    return (
                      <div
                        key={p.name}
                        className="flex items-center justify-between text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor: COLORS[i % COLORS.length],
                            }}
                          />
                          <span>{p.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>
                            {actualPct}% actual / {p.targetRatio}% target
                          </span>
                          {Math.abs(diff) > 10 && (
                            <Badge
                              variant={diff > 0 ? "secondary" : "destructive"}
                              className="text-xs"
                            >
                              {diff > 0 ? "+" : ""}
                              {diff}%
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No content pillar data yet
              </p>
            )}
          </CardContent>
        </Card>

        {/* Usage over time */}
        <Card>
          <CardHeader>
            <CardTitle>AI Usage</CardTitle>
            <CardDescription>Token spend over time</CardDescription>
          </CardHeader>
          <CardContent>
            {data.weeklyUsage.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={data.weeklyUsage.map((w) => ({
                    week: new Date(w.week).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    }),
                    cost: Number((w.totalCost / 100).toFixed(2)),
                    tokens: Math.round(w.totalTokens / 1000),
                  }))}
                >
                  <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="tokens" fill="#3b82f6" name="tokens" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No usage data yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
