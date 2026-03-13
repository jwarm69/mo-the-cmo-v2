"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Sparkles,
  Target,
  BarChart3,
  Lightbulb,
} from "lucide-react";
import { toast } from "sonner";

interface PillarHealth {
  pillar: string;
  status: "healthy" | "needs_attention" | "gap";
  note: string;
}

interface GoalProgress {
  goal: string;
  status: "on_track" | "at_risk" | "behind";
  note: string;
}

interface WeeklyBriefData {
  summary: string;
  pillarHealth: PillarHealth[];
  goalProgress: GoalProgress[];
  priorities: string[];
  keyInsight: string;
}

const STATUS_COLOR: Record<string, string> = {
  healthy: "bg-green-500/10 text-green-700",
  needs_attention: "bg-yellow-500/10 text-yellow-700",
  gap: "bg-red-500/10 text-red-700",
  on_track: "bg-green-500/10 text-green-700",
  at_risk: "bg-yellow-500/10 text-yellow-700",
  behind: "bg-red-500/10 text-red-700",
};

export function WeeklyBrief() {
  const [brief, setBrief] = useState<WeeklyBriefData | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/brief/weekly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = await res.json();
        setBrief(data);
        setExpanded(true);
      } else {
        toast.error("Failed to generate brief");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm">Weekly Marketing Brief</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleGenerate}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="mr-1 h-3 w-3" />
              )}
              {brief ? "Refresh" : "Generate Brief"}
            </Button>
            {brief && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>
        {!brief && (
          <CardDescription className="text-xs">
            Get Mo&apos;s weekly summary, pillar health, and priorities.
          </CardDescription>
        )}
      </CardHeader>

      {brief && expanded && (
        <CardContent className="space-y-4">
          {/* Summary */}
          <div>
            <p className="text-sm">{brief.summary}</p>
          </div>

          {/* Pillar Health */}
          {brief.pillarHealth.length > 0 && (
            <div>
              <div className="flex items-center gap-1 mb-2">
                <BarChart3 className="h-3 w-3 text-muted-foreground" />
                <p className="text-xs font-medium text-muted-foreground">
                  Pillar Health
                </p>
              </div>
              <div className="space-y-1">
                {brief.pillarHealth.map((p, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>{p.pillar}</span>
                    <Badge
                      variant="secondary"
                      className={`text-xs ${STATUS_COLOR[p.status] || ""}`}
                    >
                      {p.status.replace("_", " ")}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Goal Progress */}
          {brief.goalProgress.length > 0 && (
            <div>
              <div className="flex items-center gap-1 mb-2">
                <Target className="h-3 w-3 text-muted-foreground" />
                <p className="text-xs font-medium text-muted-foreground">
                  Goal Progress
                </p>
              </div>
              <div className="space-y-2">
                {brief.goalProgress.map((g, i) => {
                  const progressValue =
                    g.status === "on_track"
                      ? 75
                      : g.status === "at_risk"
                        ? 45
                        : 20;

                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="truncate">{g.goal}</span>
                        <Badge
                          variant="secondary"
                          className={`text-xs ${STATUS_COLOR[g.status] || ""}`}
                        >
                          {g.status.replace("_", " ")}
                        </Badge>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            g.status === "on_track"
                              ? "bg-green-500"
                              : g.status === "at_risk"
                                ? "bg-yellow-500"
                                : "bg-red-500"
                          }`}
                          style={{ width: `${progressValue}%` }}
                        />
                      </div>
                      {g.note && (
                        <p className="text-xs text-muted-foreground">{g.note}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Priorities */}
          {brief.priorities.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                This Week&apos;s Priorities
              </p>
              <ul className="space-y-1">
                {brief.priorities.map((p, i) => (
                  <li key={i} className="text-sm flex items-start gap-2">
                    <span className="text-muted-foreground text-xs mt-0.5">
                      {i + 1}.
                    </span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Key Insight */}
          {brief.keyInsight && (
            <div className="rounded-lg border bg-primary/5 p-3">
              <div className="flex items-center gap-1 mb-1">
                <Lightbulb className="h-3 w-3 text-primary" />
                <p className="text-xs font-medium text-primary">Key Insight</p>
              </div>
              <p className="text-sm">{brief.keyInsight}</p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
