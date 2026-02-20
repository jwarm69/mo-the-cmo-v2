"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CadenceEditor } from "@/components/settings/cadence-editor";
import { ArrowRight, Loader2, Zap } from "lucide-react";

export default function PlanPage() {
  const [generating, setGenerating] = useState(false);

  const handleGenerateWeek = async () => {
    setGenerating(true);
    try {
      await fetch("/api/content/bulk", { method: "POST" });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Content Plan</h2>
          <p className="text-muted-foreground">
            Configure cadence and generate a complete week of content.
          </p>
        </div>
        <Button onClick={handleGenerateWeek} disabled={generating}>
          {generating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Planning...
            </>
          ) : (
            <>
              <Zap className="mr-2 h-4 w-4" />
              Plan My Week
            </>
          )}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Plan Workflow</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>1. Set your weekly cadence.</p>
          <p>2. Run week generation.</p>
          <p>3. Review and approve in Content.</p>
          <Link href="/content" className="inline-flex items-center text-primary hover:underline">
            Open Content Queue
            <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </CardContent>
      </Card>

      <CadenceEditor />
    </div>
  );
}
