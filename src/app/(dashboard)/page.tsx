"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buildClientApiHeaders, CLIENT_DEFAULT_ORG_SLUG } from "@/lib/client-config";
import { DEFAULT_BRAND_PROFILE } from "@/lib/brand/defaults";
import { ArrowRight, CheckCircle2, Sparkles, Zap } from "lucide-react";

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

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [queue, setQueue] = useState<QueueResponse | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [workingItemId, setWorkingItemId] = useState<string | null>(null);

  async function load() {
    try {
      const [brandRes, statsRes, queueRes] = await Promise.all([
        fetch(
          `/api/brand?orgSlug=${encodeURIComponent(CLIENT_DEFAULT_ORG_SLUG)}`,
          { headers: buildClientApiHeaders() }
        ),
        fetch("/api/dashboard/stats", { headers: buildClientApiHeaders() }),
        fetch("/api/queue", { headers: buildClientApiHeaders() }),
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

  useEffect(() => {
    load();
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
            {orgName} Marketing Home
          </h2>
          <p className="text-muted-foreground">
            One workflow: plan the week, review queue, publish.
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
