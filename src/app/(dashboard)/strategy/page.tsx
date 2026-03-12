"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  Sparkles,
  Calendar,
  Rocket,
  Lightbulb,
  MapPin,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

interface Product {
  id: string;
  name: string;
}

interface GeneratedPlan {
  plan?: {
    id: string;
    title: string;
    theme: string | null;
    type: string;
    status: string;
  };
  details?: Record<string, unknown>;
  ideas?: Record<string, unknown>;
  tacticsCount?: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  digital: "bg-blue-500/10 text-blue-700 border-blue-200",
  physical: "bg-green-500/10 text-green-700 border-green-200",
  guerrilla: "bg-pink-500/10 text-pink-700 border-pink-200",
  partnership: "bg-purple-500/10 text-purple-700 border-purple-200",
  activation: "bg-orange-500/10 text-orange-700 border-orange-200",
  creative: "bg-yellow-500/10 text-yellow-700 border-yellow-200",
  direct: "bg-teal-500/10 text-teal-700 border-teal-200",
};

export default function StrategyPage() {
  const searchParams = useSearchParams();
  const preselectedType = searchParams.get("type") || "";
  const preselectedProductId = searchParams.get("productId") || "";

  const [planType, setPlanType] = useState(preselectedType || "quarterly");
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState(preselectedProductId);
  const [focus, setFocus] = useState("");
  const [constraints, setConstraints] = useState("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GeneratedPlan | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["0", "1", "2"]));

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then(setProducts)
      .catch(() => {});
  }, []);

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setResult(null);
    try {
      const now = new Date();
      let startDate: string;
      let endDate: string;

      if (planType === "quarterly") {
        const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        startDate = quarterStart.toISOString().split("T")[0];
        const quarterEnd = new Date(quarterStart);
        quarterEnd.setMonth(quarterEnd.getMonth() + 3);
        quarterEnd.setDate(quarterEnd.getDate() - 1);
        endDate = quarterEnd.toISOString().split("T")[0];
      } else if (planType === "monthly") {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
      } else {
        startDate = now.toISOString().split("T")[0];
        endDate = new Date(now.getTime() + 90 * 86400000).toISOString().split("T")[0];
      }

      const res = await fetch("/api/plans/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: planType,
          productId: productId || undefined,
          startDate,
          endDate,
          focus: focus || undefined,
          constraints: constraints || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setResult(data);
      }
    } finally {
      setGenerating(false);
    }
  };

  const planTypeConfig = [
    {
      value: "quarterly",
      label: "Quarterly Plan",
      icon: Calendar,
      description: "Full quarter strategy with monthly breakdown and channel mix",
    },
    {
      value: "monthly",
      label: "Monthly Plan",
      icon: MapPin,
      description: "Week-by-week action plan across all marketing channels",
    },
    {
      value: "launch",
      label: "Launch Plan",
      icon: Rocket,
      description: "Phased launch campaign: seed, position, urgency, nurture",
    },
    {
      value: "ideation",
      label: "Brainstorm",
      icon: Lightbulb,
      description: "Creative tactics across guerrilla, physical, digital, and more",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl md:text-2xl font-bold tracking-tight">Strategic Planning</h2>
        <p className="text-sm md:text-base text-muted-foreground">
          Mo builds comprehensive marketing strategies — not just social posts.
        </p>
      </div>

      {/* Plan Type Selection */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {planTypeConfig.map((config) => (
          <Card
            key={config.value}
            className={`cursor-pointer transition-all ${
              planType === config.value
                ? "ring-2 ring-primary"
                : "hover:border-primary/50"
            }`}
            onClick={() => setPlanType(config.value)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <config.icon className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{config.label}</span>
              </div>
              <p className="text-xs text-muted-foreground">{config.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configure Your Plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {planType === "launch" && (
            <div className="space-y-2">
              <Label>Product to Launch</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
              >
                <option value="">Select a product...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {planType === "ideation" && (
            <div className="space-y-2">
              <Label>What do you need ideas for?</Label>
              <Textarea
                placeholder="e.g., Getting more clients for my group coaching program, building local awareness, pre-launch buzz..."
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
                rows={2}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label>Constraints (optional)</Label>
            <Input
              placeholder="e.g., Budget is $500/month, located in Austin TX, can spend 10 hrs/week on marketing"
              value={constraints}
              onChange={(e) => setConstraints(e.target.value)}
            />
          </div>
          <Button
            onClick={handleGenerate}
            disabled={generating || (planType === "launch" && !productId)}
            className="w-full sm:w-auto"
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Mo is thinking...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate{" "}
                {planTypeConfig.find((c) => c.value === planType)?.label || "Plan"}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {result.plan && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{result.plan.title}</CardTitle>
                  <Badge variant="outline">{result.plan.status}</Badge>
                </div>
                {result.plan.theme && (
                  <p className="text-sm text-muted-foreground">
                    Theme: {result.plan.theme}
                  </p>
                )}
                {result.tacticsCount != null && result.tacticsCount > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {result.tacticsCount} tactics generated
                  </p>
                )}
              </CardHeader>
            </Card>
          )}

          {/* Render plan details */}
          {result.details && renderPlanDetails(result.details, expandedSections, toggleSection)}

          {/* Render ideation results */}
          {result.ideas && renderIdeationResults(result.ideas as Record<string, unknown>)}
        </div>
      )}
    </div>
  );
}

function renderPlanDetails(
  details: Record<string, unknown>,
  expandedSections: Set<string>,
  toggleSection: (key: string) => void
) {
  const months = details.months as {
    monthLabel?: string;
    theme?: string;
    focusAreas?: string[];
    tactics?: { channel: string; channelCategory: string; title: string; description: string; effort: string }[];
    milestones?: string[];
  }[];

  const weeks = details.weeks as {
    weekNumber?: number;
    theme?: string;
    tactics?: { channel: string; channelCategory: string; title: string; description: string; effort: string; dayOfWeek?: string }[];
  }[];

  const phases = details.phases as {
    name?: string;
    objective?: string;
    keyMessage?: string;
    tactics?: { channel: string; channelCategory: string; title: string; description: string; effort: string }[];
  }[];

  const keyMessages = details.keyMessages as string[] | undefined;
  const successMetrics = details.successMetrics as string[] | undefined;

  return (
    <div className="space-y-4">
      {/* Strategic Priorities */}
      {details.strategicPriorities && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Strategic Priorities</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {(details.strategicPriorities as string[]).map((p, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-primary font-bold">{i + 1}.</span> {p}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Monthly Breakdown (Quarterly Plans) */}
      {months?.map((month, mi) => (
        <Card key={mi}>
          <CardHeader
            className="cursor-pointer pb-2"
            onClick={() => toggleSection(String(mi))}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {month.monthLabel || `Month ${mi + 1}`}
              </CardTitle>
              {expandedSections.has(String(mi)) ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            {month.theme && (
              <p className="text-sm text-muted-foreground">Theme: {month.theme}</p>
            )}
          </CardHeader>
          {expandedSections.has(String(mi)) && (
            <CardContent className="space-y-3">
              {month.focusAreas && (
                <div className="flex flex-wrap gap-1">
                  {month.focusAreas.map((area, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {area}
                    </Badge>
                  ))}
                </div>
              )}
              {month.tactics && renderTacticsList(month.tactics)}
              {month.milestones && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Milestones</p>
                  <ul className="text-sm space-y-1">
                    {month.milestones.map((m, i) => (
                      <li key={i} className="flex items-start gap-1">
                        <span className="text-primary">-</span> {m}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          )}
        </Card>
      ))}

      {/* Weekly Breakdown (Monthly Plans) */}
      {weeks?.map((week, wi) => (
        <Card key={wi}>
          <CardHeader
            className="cursor-pointer pb-2"
            onClick={() => toggleSection(`w${wi}`)}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Week {week.weekNumber || wi + 1}
              </CardTitle>
              {expandedSections.has(`w${wi}`) ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            {week.theme && (
              <p className="text-sm text-muted-foreground">{week.theme}</p>
            )}
          </CardHeader>
          {expandedSections.has(`w${wi}`) && (
            <CardContent>{week.tactics && renderTacticsList(week.tactics)}</CardContent>
          )}
        </Card>
      ))}

      {/* Launch Phases */}
      {phases?.map((phase, pi) => (
        <Card key={pi}>
          <CardHeader
            className="cursor-pointer pb-2"
            onClick={() => toggleSection(`p${pi}`)}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{phase.name || `Phase ${pi + 1}`}</CardTitle>
              {expandedSections.has(`p${pi}`) ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            {phase.objective && (
              <p className="text-sm text-muted-foreground">{phase.objective}</p>
            )}
          </CardHeader>
          {expandedSections.has(`p${pi}`) && (
            <CardContent className="space-y-3">
              {phase.keyMessage && (
                <p className="text-sm italic border-l-2 border-primary pl-3">
                  &ldquo;{phase.keyMessage}&rdquo;
                </p>
              )}
              {phase.tactics && renderTacticsList(phase.tactics)}
            </CardContent>
          )}
        </Card>
      ))}

      {/* Key Messages & Success Metrics */}
      {(keyMessages || successMetrics) && (
        <div className="grid gap-4 md:grid-cols-2">
          {keyMessages && keyMessages.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Key Messages</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-1">
                  {keyMessages.map((m, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <span className="text-primary">-</span> {m}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
          {successMetrics && successMetrics.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Success Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-1">
                  {successMetrics.map((m, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <span className="text-primary">-</span> {m}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function renderTacticsList(
  tactics: { channel: string; channelCategory: string; title: string; description?: string; effort?: string }[]
) {
  return (
    <div className="space-y-2">
      {tactics.map((tactic, i) => (
        <div key={i} className="flex items-start gap-3 p-2 rounded-lg bg-muted/50">
          <Badge
            variant="outline"
            className={`text-xs shrink-0 ${CATEGORY_COLORS[tactic.channelCategory] || ""}`}
          >
            {tactic.channel}
          </Badge>
          <div className="min-w-0">
            <p className="text-sm font-medium">{tactic.title}</p>
            {tactic.description && (
              <p className="text-xs text-muted-foreground mt-0.5">{tactic.description}</p>
            )}
          </div>
          {tactic.effort && (
            <Badge variant="outline" className="text-xs shrink-0 ml-auto">
              {tactic.effort}
            </Badge>
          )}
        </div>
      ))}
    </div>
  );
}

function renderIdeationResults(ideas: Record<string, unknown>) {
  const tactics = ideas.tactics as {
    channel: string;
    channelCategory: string;
    title: string;
    description: string;
    whyItWorks: string;
    effort: string;
    cost: string;
    timeframe: string;
    expectedOutcome: string;
  }[];

  if (!tactics) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">
        {(ideas.ideationTheme as string) || "Marketing Ideas"}
      </h3>
      {tactics.map((tactic, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Badge
                variant="outline"
                className={`text-xs shrink-0 ${CATEGORY_COLORS[tactic.channelCategory] || ""}`}
              >
                {tactic.channel}
              </Badge>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{tactic.title}</p>
                <p className="text-sm text-muted-foreground mt-1">{tactic.description}</p>
                <p className="text-xs text-primary mt-1 italic">{tactic.whyItWorks}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">
                    Effort: {tactic.effort}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Cost: {tactic.cost}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {tactic.timeframe}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
