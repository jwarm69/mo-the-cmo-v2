"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Radio, Zap, Pause, X, Search, MessageSquare } from "lucide-react";

interface ChannelExperiment {
  id: string;
  hypothesis: string;
  action: string;
  result: string | null;
  verdict: string | null;
  createdAt: string;
}

interface Channel {
  id: string;
  channel: string;
  channelCategory: string;
  status: string;
  priority: number;
  rationale: string | null;
  notes: string | null;
  experiments: ChannelExperiment[];
  createdAt: string;
}

const STATUS_BADGES: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
  exploring: { variant: "outline", label: "Exploring" },
  planned: { variant: "secondary", label: "Planned" },
  active: { variant: "default", label: "Active" },
  paused: { variant: "destructive", label: "Paused" },
  killed: { variant: "destructive", label: "Killed" },
};

const CATEGORY_ICONS: Record<string, string> = {
  digital: "💻",
  physical: "📍",
  guerrilla: "🎯",
  partnership: "🤝",
  activation: "🚀",
  creative: "🎨",
  direct: "📬",
};

export default function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  const fetchChannels = useCallback(async () => {
    try {
      const res = await fetch("/api/channels");
      if (res.ok) {
        setChannels(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  const filtered = filter === "all"
    ? channels
    : channels.filter((ch) => ch.status === filter);

  const statusCounts = {
    all: channels.length,
    active: channels.filter((c) => c.status === "active").length,
    exploring: channels.filter((c) => c.status === "exploring").length,
    planned: channels.filter((c) => c.status === "planned").length,
    paused: channels.filter((c) => c.status === "paused").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">Channel Strategy</h2>
          <p className="text-sm md:text-base text-muted-foreground">
            Track, experiment, and optimize your marketing channel mix.
          </p>
        </div>
        <Link href="/chat">
          <Button>
            <MessageSquare className="mr-2 h-4 w-4" />
            Ask Mo About Channels
          </Button>
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {(["all", "active", "exploring", "planned", "paused"] as const).map((status) => (
          <Button
            key={status}
            variant={filter === status ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(status)}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)} ({statusCounts[status]})
          </Button>
        ))}
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-sm text-muted-foreground">Loading channels...</p>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Radio className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">
              {channels.length === 0 ? "No channels tracked yet" : "No channels match this filter"}
            </h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Ask Mo to assess channel fit or add channels manually in the chat.
            </p>
            <Link href="/chat">
              <Button>Ask Mo to Assess Channels</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((ch) => {
            const badge = STATUS_BADGES[ch.status] ?? STATUS_BADGES.exploring;
            const icon = CATEGORY_ICONS[ch.channelCategory] ?? "📌";

            return (
              <Card key={ch.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{icon}</span>
                      <CardTitle className="text-base">{ch.channel}</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">P{ch.priority}</Badge>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </div>
                  </div>
                  <CardDescription className="text-xs">{ch.channelCategory}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {ch.rationale && (
                    <p className="text-sm text-muted-foreground">{ch.rationale}</p>
                  )}
                  {ch.notes && (
                    <p className="text-xs text-muted-foreground italic">{ch.notes}</p>
                  )}
                  {ch.experiments.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium">Recent Experiments ({ch.experiments.length})</p>
                      {ch.experiments.slice(0, 2).map((exp) => (
                        <div key={exp.id} className="rounded bg-muted p-2 text-xs">
                          <p className="font-medium">{exp.hypothesis.slice(0, 80)}</p>
                          {exp.verdict && (
                            <Badge variant={exp.verdict === "success" ? "default" : "secondary"} className="mt-1 text-xs">
                              {exp.verdict}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
