"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Sparkles } from "lucide-react";

interface ActivityItem {
  id: string;
  platform: string;
  status: string;
  title: string;
  performanceScore: number | null;
  hasAgentLoop: boolean;
  createdAt: string;
}

const PLATFORM_COLORS: Record<string, string> = {
  tiktok: "bg-pink-500/10 text-pink-600 border-pink-200",
  instagram: "bg-violet-500/10 text-violet-600 border-violet-200",
  twitter: "bg-sky-500/10 text-sky-600 border-sky-200",
  email: "bg-amber-500/10 text-amber-600 border-amber-200",
  blog: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "secondary",
  pending_approval: "outline",
  approved: "default",
  scheduled: "default",
  published: "default",
};

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function RecentActivity({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No content created yet. Generate your first piece to see activity here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 rounded-lg border p-2.5"
          >
            <Badge
              variant="outline"
              className={`shrink-0 text-xs ${PLATFORM_COLORS[item.platform] ?? ""}`}
            >
              {item.platform}
            </Badge>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{item.title}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {timeAgo(item.createdAt)}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <Badge variant={STATUS_VARIANT[item.status] ?? "secondary"} className="text-xs">
                {item.status.replace("_", " ")}
              </Badge>
              {item.performanceScore != null && (
                <Badge variant="outline" className="text-xs font-mono">
                  {item.performanceScore}
                </Badge>
              )}
              {item.hasAgentLoop && (
                <Sparkles className="h-3.5 w-3.5 text-primary" />
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function RecentActivitySkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-5 w-28 animate-pulse rounded bg-muted" />
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg border p-2.5">
            <div className="h-5 w-16 animate-pulse rounded bg-muted" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-3 w-16 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-5 w-14 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
