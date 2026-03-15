"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DEFAULT_BRAND_PROFILE } from "@/lib/brand/defaults";
import {
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Zap,
  AlertTriangle,
  Radio,
  Target,
  TrendingUp,
} from "lucide-react";
import { WeeklyBrief } from "@/components/dashboard/weekly-brief";

interface DashboardStats {
  orgName: string;
  pipeline: {
    draft: number;
    pending_approval: number;
    approved: number;
    scheduled: number;
    published: number;
  };
  contentThisMonth: number;
  usage: {
    spentCents: number;
    limitCents: number;
  };
}

interface QueueItem {
  id: string;
  type: "approval" | "stale" | "campaign" | "plan";
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  actionLabel: string;
  actionHref: string;
  actionType: "approve" | "publish" | "none";
  contentId?: string;
}

interface QueueResponse {
  orgName: string;
  pendingApprovals: number;
  scheduledNextWeek: number;
  items: QueueItem[];
}

interface GtmBriefing {
  urgentItems: string[];
  thisWeekPriorities: string[];
  channelHealth: { channel: string; status: string; concern?: string }[];
  campaignProgress: { name: string; completionPercent: number; overdueCount: number; nextMilestone?: string }[];
  icpInsights: string[];
  strategicRecommendation: string;
  generatedAt: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [queue, setQueue] = useState<QueueResponse | null>(null);
  const [briefing, setBriefing] = useState<GtmBriefing | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [briefingLoading, setBriefingLoading] = useState(true);
  const [workingItemId, setWorkingItemId] = useState<string | null>(null);

  async function load() {
    try {
      const [brandRes, statsRes, queueRes] = await Promise.all([
        fetch("/api/brand"),
        fetch("/api/dashboard/stats"),
        fetch("/api/queue"),
      ]);

      const brandData = await brandRes.json();
      const profile = brandData.profile;
      if (!profile || profile.voice === DEFAULT_BRAND_PROFILE.voice) {
        setNeedsSetup(true);
      }

      if (statsRes.ok) setStats(await statsRes.json());
      if (queueRes.ok) setQueue(await queueRes.json());
    } catch {
      setNeedsSetup(true);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadBriefing() {
    try {
      const res = await fetch("/api/gtm/briefing");
      if (res.ok) setBriefing(await res.json());
    } catch {
      // Non-critical
    } finally {
      setBriefingLoading(false);
    }
  }

  useEffect(() => {
    load();
    loadBriefing();
  }, []);

  const orgName = queue?.orgName ?? stats?.orgName ?? "Your Brand";
  const spent = ((stats?.usage.spentCents ?? 0) / 100).toFixed(2);
  const limit = ((stats?.usage.limitCents ?? 0) / 100).toFixed(2);

  const handleApprove = async (item: QueueItem) => {
    if (!item.contentId) return;
    setWorkingItemId(item.id);
    try {
      await fetch(`/api/content/${item.contentId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      await load();
    } finally {
      setWorkingItemId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {orgName} GTM Command Center
          </h2>
          <p className="text-muted-foreground">
            Strategy, execution, and momentum — all in one view.
          </p>
        </div>
        <Link href="/plan">
          <Button>
            <Zap className="mr-2 h-4 w-4" />
            Plan My Week
          </Button>
        </Link>
      </div>

      {needsSetup && !isLoading && (
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardHeader className="flex flex-row items-center gap-4">
            <div className="rounded-lg bg-primary/10 p-3">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle>Set Up Mo for Your Brand</CardTitle>
              <CardDescription>
                Complete setup once so Mo can generate better weekly plans.
              </CardDescription>
            </div>
            <Link href="/setup">
              <Button>
                Start Setup
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
        </Card>
      )}

      {/* GTM Briefing Card — Phase 4 */}
      {!briefingLoading && briefing && (
        <Card className="border-primary/10">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <CardTitle>Mo&apos;s GTM Briefing</CardTitle>
            </div>
            <CardDescription>
              Proactive assessment as of {new Date(briefing.generatedAt).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Urgent Items */}
            {briefing.urgentItems.length > 0 && (
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <p className="text-sm font-medium">Urgent</p>
                </div>
                <ul className="space-y-1">
                  {briefing.urgentItems.map((item, i) => (
                    <li key={i} className="text-sm text-muted-foreground">&bull; {item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* This Week Priorities */}
            {briefing.thisWeekPriorities.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium">This Week</p>
                <ul className="space-y-1">
                  {briefing.thisWeekPriorities.map((item, i) => (
                    <li key={i} className="text-sm text-muted-foreground">&bull; {item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Strategic Recommendation */}
            {briefing.strategicRecommendation && (
              <div className="rounded-lg bg-primary/5 p-3">
                <p className="text-sm font-medium">Strategic Insight</p>
                <p className="text-sm text-muted-foreground">{briefing.strategicRecommendation}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Channel Health Strip */}
      {briefing && briefing.channelHealth.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Radio className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium">Channel Health</p>
            <Link href="/channels" className="ml-auto text-xs text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {briefing.channelHealth.map((ch, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-lg border px-3 py-2"
              >
                <span className="text-sm font-medium">{ch.channel}</span>
                <Badge variant={ch.status === "active" ? "default" : "secondary"} className="text-xs">
                  {ch.status}
                </Badge>
                {ch.concern && (
                  <span className="text-xs text-destructive">{ch.concern}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Campaign Progress */}
      {briefing && briefing.campaignProgress.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium">Campaign Progress</p>
            <Link href="/campaigns" className="ml-auto text-xs text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {briefing.campaignProgress.map((c, i) => (
              <div key={i} className="rounded-lg border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-medium truncate">{c.name}</p>
                  {c.overdueCount > 0 && (
                    <Badge variant="destructive" className="text-xs">{c.overdueCount} overdue</Badge>
                  )}
                </div>
                <div className="mb-1 h-2 w-full rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary transition-all"
                    style={{ width: `${Math.min(c.completionPercent, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{c.completionPercent}%</span>
                  {c.nextMilestone && <span>Next: {c.nextMilestone}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <WeeklyBrief />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Pending Approval</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{queue?.pendingApprovals ?? 0}</p>
            <p className="text-xs text-muted-foreground">items waiting in review queue</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Scheduled Next 7 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{queue?.scheduledNextWeek ?? 0}</p>
            <p className="text-xs text-muted-foreground">planned posts</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${spent}</p>
            <p className="text-xs text-muted-foreground">of ${limit} monthly budget</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Action Queue</CardTitle>
          <CardDescription>
            Execute these next actions to keep momentum.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading queue...</p>
          ) : (queue?.items.length ?? 0) === 0 ? (
            <div className="rounded-lg border p-3 text-sm text-muted-foreground">
              Queue is clear. Run <span className="font-medium text-foreground">Plan My Week</span> to fill it.
            </div>
          ) : (
            queue?.items.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    <Badge variant={item.priority === "high" ? "destructive" : "secondary"}>
                      {item.priority}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  {item.actionType === "approve" && item.contentId ? (
                    <Button
                      size="sm"
                      onClick={() => handleApprove(item)}
                      disabled={workingItemId === item.id}
                    >
                      {workingItemId === item.id ? (
                        <>Saving...</>
                      ) : (
                        <>
                          <CheckCircle2 className="mr-1 h-4 w-4" />
                          {item.actionLabel}
                        </>
                      )}
                    </Button>
                  ) : (
                    <Link href={item.actionHref}>
                      <Button size="sm">{item.actionLabel}</Button>
                    </Link>
                  )}
                  <Link href={item.actionHref}>
                    <Button variant="ghost" size="sm">
                      Open
                    </Button>
                  </Link>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
