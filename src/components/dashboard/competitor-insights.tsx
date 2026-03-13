"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye } from "lucide-react";

interface CompetitorProfile {
  id: string;
  name: string;
  urls: string[];
  lastScrapedAt: string | null;
  contentCount: number;
  latestAnalysis: {
    themes?: string[];
    summary?: string;
    [key: string]: unknown;
  } | null;
}

export function CompetitorInsights() {
  const [competitors, setCompetitors] = useState<CompetitorProfile[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/competitors?limit=3")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: CompetitorProfile[]) => {
        setCompetitors(data);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  if (!loaded) return null;

  if (competitors.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm">Competitor Watch</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No competitors configured yet.{" "}
            <Link href="/competitors" className="underline hover:text-foreground">
              Add competitors
            </Link>{" "}
            to start monitoring.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm">Competitor Watch</CardTitle>
          </div>
          <Link
            href="/competitors"
            className="text-xs text-muted-foreground underline hover:text-foreground"
          >
            View All
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {competitors.map((c) => (
          <div key={c.id} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="truncate text-sm font-medium">{c.name}</span>
              <Badge variant="secondary" className="shrink-0 text-xs">
                {c.lastScrapedAt
                  ? new Date(c.lastScrapedAt).toLocaleDateString()
                  : "Not scanned"}
              </Badge>
            </div>
            {c.latestAnalysis?.themes &&
              Array.isArray(c.latestAnalysis.themes) &&
              c.latestAnalysis.themes.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {(c.latestAnalysis.themes as string[]).slice(0, 3).map((theme) => (
                    <Badge key={theme} variant="outline" className="text-xs">
                      {theme}
                    </Badge>
                  ))}
                </div>
              )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
