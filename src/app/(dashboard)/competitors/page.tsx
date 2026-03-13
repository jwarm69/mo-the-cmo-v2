"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Eye,
  Plus,
  Trash2,
  Loader2,
  Search,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";

interface AnalysisData {
  themes?: string[];
  postingFrequency?: string;
  contentTypes?: string[];
  engagementStrategies?: string[];
  keyMessaging?: string[];
  strengths?: string[];
  weaknesses?: string[];
  opportunities?: string[];
  summary?: string;
  [key: string]: unknown;
}

interface CompetitorProfile {
  id: string;
  name: string;
  urls: string[];
  lastScrapedAt: string | null;
  contentCount: number;
  latestAnalysis: AnalysisData | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export default function CompetitorsPage() {
  const [competitors, setCompetitors] = useState<CompetitorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/competitors");
      if (res.ok) setCompetitors(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    setSaving(true);
    try {
      const urls = urlInput
        .split(",")
        .map((u) => u.trim())
        .filter((u) => u.length > 0);

      const res = await fetch("/api/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, urls }),
      });

      if (res.ok) {
        toast.success("Competitor added");
        setName("");
        setUrlInput("");
        setShowAddForm(false);
        load();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to add competitor");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (competitorId: string) => {
    const res = await fetch("/api/competitors", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ competitorId }),
    });
    if (res.ok) {
      toast.success("Competitor removed");
      if (expandedId === competitorId) setExpandedId(null);
      load();
    } else {
      toast.error("Failed to delete competitor");
    }
  };

  const handleAnalyze = async (competitorId: string) => {
    setAnalyzingId(competitorId);
    try {
      const res = await fetch("/api/competitors/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ competitorId }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Analyzed ${data.analyzed} page(s)`);
        setExpandedId(competitorId);
        load();
      } else {
        toast.error(data.error || "Analysis failed");
      }
    } finally {
      setAnalyzingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Competitors</h2>
          <p className="text-muted-foreground">
            Monitor competitor content and extract strategic insights.
          </p>
        </div>
        <Button onClick={() => setShowAddForm(!showAddForm)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Competitor
        </Button>
      </div>

      {/* Add Competitor Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Add Competitor</CardTitle>
            <CardDescription>
              Enter the competitor name and their URLs (comma-separated).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input
                placeholder="Competitor name (e.g., FitPro Academy)"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Input
                placeholder="URLs, comma-separated (e.g., https://fitpro.com, https://instagram.com/fitpro)"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleAdd}
                disabled={saving || !name.trim()}
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowAddForm(false);
                  setName("");
                  setUrlInput("");
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : competitors.length === 0 ? (
        /* Empty state */
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Eye className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">
              No competitors tracked
            </h3>
            <p className="text-sm text-muted-foreground">
              Add competitors to monitor their content strategy and discover
              opportunities.
            </p>
          </CardContent>
        </Card>
      ) : (
        /* Competitor list */
        <div className="space-y-4">
          {competitors.map((c) => {
            const isExpanded = expandedId === c.id;
            const analysis = c.latestAnalysis;

            return (
              <Card key={c.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{c.name}</CardTitle>
                      <CardDescription>
                        {(c.urls ?? []).length} URL
                        {(c.urls ?? []).length !== 1 ? "s" : ""} tracked
                        {c.contentCount > 0 &&
                          ` | ${c.contentCount} content item${c.contentCount !== 1 ? "s" : ""}`}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleAnalyze(c.id)}
                        disabled={analyzingId !== null}
                      >
                        {analyzingId === c.id ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <Search className="mr-1 h-3 w-3" />
                        )}
                        Analyze
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => handleDelete(c.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* URLs */}
                  {(c.urls ?? []).length > 0 && (
                    <div className="space-y-1">
                      {(c.urls ?? []).map((url, i) => (
                        <p
                          key={i}
                          className="truncate text-xs text-muted-foreground"
                        >
                          {url}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Last analyzed badge */}
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-xs">
                      {c.lastScrapedAt
                        ? `Last analyzed: ${new Date(c.lastScrapedAt).toLocaleDateString()}`
                        : "Never analyzed"}
                    </Badge>
                    {analysis && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setExpandedId(isExpanded ? null : c.id)
                        }
                      >
                        {isExpanded ? (
                          <ChevronUp className="mr-1 h-3 w-3" />
                        ) : (
                          <ChevronDown className="mr-1 h-3 w-3" />
                        )}
                        {isExpanded ? "Hide" : "Show"} Analysis
                      </Button>
                    )}
                  </div>

                  {/* Expandable analysis section */}
                  {isExpanded && analysis && (
                    <div className="space-y-4 rounded-lg border bg-muted/50 p-4">
                      {/* Summary */}
                      {analysis.summary && (
                        <div>
                          <h4 className="mb-1 text-sm font-semibold">
                            Summary
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {analysis.summary}
                          </p>
                        </div>
                      )}

                      {/* Themes */}
                      {analysis.themes &&
                        Array.isArray(analysis.themes) &&
                        analysis.themes.length > 0 && (
                          <div>
                            <h4 className="mb-1 text-sm font-semibold">
                              Themes
                            </h4>
                            <div className="flex flex-wrap gap-1">
                              {analysis.themes.map((theme) => (
                                <Badge key={theme} variant="outline">
                                  {theme}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                      {/* Content Types */}
                      {analysis.contentTypes &&
                        Array.isArray(analysis.contentTypes) &&
                        analysis.contentTypes.length > 0 && (
                          <div>
                            <h4 className="mb-1 text-sm font-semibold">
                              Content Types
                            </h4>
                            <div className="flex flex-wrap gap-1">
                              {analysis.contentTypes.map((t) => (
                                <Badge key={t} variant="secondary">
                                  {t}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                      {/* Posting Frequency */}
                      {analysis.postingFrequency && (
                        <div>
                          <h4 className="mb-1 text-sm font-semibold">
                            Posting Frequency
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {analysis.postingFrequency}
                          </p>
                        </div>
                      )}

                      {/* Strengths */}
                      <AnalysisList
                        title="Strengths"
                        items={analysis.strengths}
                      />

                      {/* Weaknesses */}
                      <AnalysisList
                        title="Weaknesses"
                        items={analysis.weaknesses}
                      />

                      {/* Opportunities */}
                      <AnalysisList
                        title="Opportunities"
                        items={analysis.opportunities}
                      />

                      {/* Key Messaging */}
                      <AnalysisList
                        title="Key Messaging"
                        items={analysis.keyMessaging}
                      />

                      {/* Engagement Strategies */}
                      <AnalysisList
                        title="Engagement Strategies"
                        items={analysis.engagementStrategies}
                      />
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

function AnalysisList({
  title,
  items,
}: {
  title: string;
  items?: string[];
}) {
  if (!items || !Array.isArray(items) || items.length === 0) return null;

  return (
    <div>
      <h4 className="mb-1 text-sm font-semibold">{title}</h4>
      <ul className="list-inside list-disc space-y-0.5">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-muted-foreground">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
