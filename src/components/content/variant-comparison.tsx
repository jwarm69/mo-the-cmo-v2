"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { ContentItem } from "@/lib/types";

export function VariantComparison({
  variants,
  onPickWinner,
}: {
  variants: ContentItem[];
  onPickWinner: (winnerId: string) => void;
}) {
  const [picking, setPicking] = useState<string | null>(null);

  if (variants.length < 2) return null;

  const handlePickWinner = async (winnerId: string) => {
    setPicking(winnerId);
    try {
      // Approve the winner
      const approveRes = await fetch(`/api/content/${winnerId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });

      if (!approveRes.ok) {
        toast.error("Failed to approve winner");
        return;
      }

      // Archive the losers
      const archivePromises = variants
        .filter((v) => v.id !== winnerId)
        .map((v) =>
          fetch(`/api/content/${v.id}/action`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "archive" }),
          })
        );

      await Promise.all(archivePromises);

      toast.success("Winner selected! Losers archived.");
      onPickWinner(winnerId);
    } catch {
      toast.error("Something went wrong picking the winner");
    } finally {
      setPicking(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Trophy className="h-4 w-4" />
          A/B Variants — Pick a Winner
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {variants.map((v, i) => {
            const score = v.performanceScore;

            return (
              <div key={v.id} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline">Variant {i + 1}</Badge>
                  {score != null && (
                    <Badge variant="secondary">{Math.round(score)}/100</Badge>
                  )}
                </div>
                <p className="text-sm font-medium">{v.hook}</p>
                <p className="text-xs text-muted-foreground line-clamp-3">
                  {v.body}
                </p>
                {v.cta && (
                  <p className="text-xs font-medium text-primary">
                    CTA: {v.cta}
                  </p>
                )}
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => handlePickWinner(v.id)}
                  disabled={picking !== null}
                >
                  {picking === v.id ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <Trophy className="mr-1 h-3 w-3" />
                  )}
                  Pick Winner
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
