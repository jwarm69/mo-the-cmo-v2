"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Lightbulb,
  AlertTriangle,
  Clock,
  Megaphone,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { buildClientApiHeaders } from "@/lib/client-config";

interface Suggestion {
  id: string;
  type: "gap" | "imbalance" | "stale" | "campaign";
  title: string;
  description: string;
  action: { label: string; href: string };
}

const TYPE_CONFIG: Record<
  string,
  { icon: React.ElementType; color: string }
> = {
  gap: { icon: AlertTriangle, color: "text-yellow-600" },
  imbalance: { icon: Lightbulb, color: "text-blue-600" },
  stale: { icon: Clock, color: "text-orange-600" },
  campaign: { icon: Megaphone, color: "text-purple-600" },
};

export function SuggestionCards() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  useEffect(() => {
    async function fetchSuggestions() {
      try {
        const res = await fetch("/api/suggestions", {
          headers: buildClientApiHeaders(),
        });
        if (res.ok) {
          setSuggestions(await res.json());
        }
      } catch {
        // Non-critical — silently fail
      }
    }
    fetchSuggestions();
  }, []);

  if (suggestions.length === 0) return null;

  return (
    <div>
      <h3 className="mb-4 text-lg font-semibold flex items-center gap-2">
        <Lightbulb className="h-5 w-5 text-primary" />
        Mo&apos;s Suggestions
      </h3>
      <div className="grid gap-3 md:grid-cols-3">
        {suggestions.map((suggestion) => {
          const config = TYPE_CONFIG[suggestion.type] || TYPE_CONFIG.gap;
          const Icon = config.icon;
          return (
            <Card key={suggestion.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${config.color}`} />
                  {suggestion.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  {suggestion.description}
                </p>
                <Link href={suggestion.action.href}>
                  <Button variant="outline" size="sm" className="w-full">
                    {suggestion.action.label}
                    <ArrowRight className="ml-2 h-3 w-3" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
