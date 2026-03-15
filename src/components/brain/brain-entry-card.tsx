"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Pencil, Trash2 } from "lucide-react";

export interface BrainEntry {
  id: string;
  type: string;
  title: string;
  content: string;
  source: string;
  sourceId?: string | null;
  confidence: number;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  audience_insight: { label: "Audience", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  icp_insight: { label: "ICP", color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200" },
  market_insight: { label: "Competitor", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
  channel_insight: { label: "Channel", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  strategy_decision: { label: "Strategy", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
  plan_context: { label: "Content Plan", color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" },
  product_info: { label: "Product", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200" },
  business_info: { label: "Business", color: "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200" },
  brand_voice: { label: "Brand Voice", color: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200" },
  performance_insight: { label: "Performance", color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" },
  goal_context: { label: "Goal", color: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200" },
  conversation_extract: { label: "Chat Extract", color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200" },
  positioning_insight: { label: "Positioning", color: "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200" },
};

export function getTypeLabel(type: string) {
  return TYPE_LABELS[type] ?? { label: type, color: "bg-gray-100 text-gray-800" };
}

interface BrainEntryCardProps {
  entry: BrainEntry;
  onEdit: (entry: BrainEntry) => void;
  onDelete: (id: string) => void;
}

export function BrainEntryCard({ entry, onEdit, onDelete }: BrainEntryCardProps) {
  const typeInfo = getTypeLabel(entry.type);

  return (
    <Card className="group transition-shadow hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Badge variant="secondary" className={`shrink-0 text-xs ${typeInfo.color}`}>
              {typeInfo.label}
            </Badge>
            <CardTitle className="text-sm font-medium truncate">
              {entry.title}
            </CardTitle>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onEdit(entry)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => onDelete(entry.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-3">
          {entry.content}
        </p>
        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
          <span>Source: {entry.source}</span>
          {entry.confidence < 1.0 && (
            <span>Confidence: {(entry.confidence * 100).toFixed(0)}%</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
