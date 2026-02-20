"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";

interface PipelineData {
  draft: number;
  pending_approval: number;
  approved: number;
  scheduled: number;
  published: number;
}

const STAGES: { key: keyof PipelineData; label: string; color: string }[] = [
  { key: "draft", label: "Draft", color: "bg-slate-500" },
  { key: "pending_approval", label: "Pending", color: "bg-amber-500" },
  { key: "approved", label: "Approved", color: "bg-emerald-500" },
  { key: "scheduled", label: "Scheduled", color: "bg-blue-500" },
  { key: "published", label: "Published", color: "bg-purple-500" },
];

export function ContentPipeline({ data }: { data: PipelineData }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Content Pipeline
        </h3>
        <div className="flex items-center gap-1 overflow-x-auto">
          {STAGES.map((stage, i) => (
            <div key={stage.key} className="flex items-center">
              <Link href={`/content?status=${stage.key}`}>
                <div className="flex min-w-[100px] cursor-pointer flex-col items-center gap-1.5 rounded-lg border p-3 transition-colors hover:bg-accent/50">
                  <div className={`h-2 w-2 rounded-full ${stage.color}`} />
                  <span className="text-xs font-medium text-muted-foreground">
                    {stage.label}
                  </span>
                  <Badge variant="secondary" className="text-base font-bold">
                    {data[stage.key]}
                  </Badge>
                </div>
              </Link>
              {i < STAGES.length - 1 && (
                <ChevronRight className="mx-1 h-4 w-4 shrink-0 text-muted-foreground/40" />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function ContentPipelineSkeleton() {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="mb-4 h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center">
              <div className="flex min-w-[100px] flex-col items-center gap-1.5 rounded-lg border p-3">
                <div className="h-2 w-2 animate-pulse rounded-full bg-muted" />
                <div className="h-3 w-12 animate-pulse rounded bg-muted" />
                <div className="h-6 w-8 animate-pulse rounded bg-muted" />
              </div>
              {i < 4 && <ChevronRight className="mx-1 h-4 w-4 text-muted-foreground/20" />}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
