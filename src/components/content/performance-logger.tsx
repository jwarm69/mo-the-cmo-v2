"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ThumbsUp, ThumbsDown } from "lucide-react";
import { toast } from "sonner";

const METRIC_FIELDS: { key: string; label: string; platforms?: string[] }[] = [
  { key: "likes", label: "Likes" },
  { key: "comments", label: "Comments" },
  { key: "shares", label: "Shares" },
  { key: "saves", label: "Saves", platforms: ["instagram"] },
  { key: "reach", label: "Reach" },
  { key: "impressions", label: "Impressions" },
  { key: "clicks", label: "Clicks" },
];

interface PerformanceLoggerProps {
  contentId: string;
  platform: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PerformanceLogger({
  contentId,
  platform,
  open,
  onOpenChange,
}: PerformanceLoggerProps) {
  const [metrics, setMetrics] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [rating, setRating] = useState<"positive" | "negative" | null>(null);
  const [saving, setSaving] = useState(false);

  const relevantFields = METRIC_FIELDS.filter(
    (f) => !f.platforms || f.platforms.includes(platform)
  );

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        platform,
        notes: notes || undefined,
        rating: rating || undefined,
      };
      for (const field of relevantFields) {
        const val = metrics[field.key];
        if (val) payload[field.key] = parseInt(val, 10) || 0;
      }

      const res = await fetch(`/api/content/${contentId}/metrics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success("Performance logged");
        onOpenChange(false);
        setMetrics({});
        setNotes("");
        setRating(null);
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to log performance");
      }
    } catch {
      toast.error("Network error logging performance");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Log Performance</DialogTitle>
          <DialogDescription>
            Record how this {platform} content performed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Quick rating */}
          <div className="space-y-2">
            <Label>Quick Rating</Label>
            <div className="flex gap-2">
              <Button
                variant={rating === "positive" ? "default" : "outline"}
                size="sm"
                onClick={() =>
                  setRating(rating === "positive" ? null : "positive")
                }
              >
                <ThumbsUp className="mr-1 h-4 w-4" />
                Good
              </Button>
              <Button
                variant={rating === "negative" ? "destructive" : "outline"}
                size="sm"
                onClick={() =>
                  setRating(rating === "negative" ? null : "negative")
                }
              >
                <ThumbsDown className="mr-1 h-4 w-4" />
                Poor
              </Button>
            </div>
          </div>

          {/* Platform-specific numeric inputs */}
          <div className="grid grid-cols-2 gap-3">
            {relevantFields.map((field) => (
              <div key={field.key} className="space-y-1">
                <Label className="text-xs">{field.label}</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={metrics[field.key] || ""}
                  onChange={(e) =>
                    setMetrics({ ...metrics, [field.key]: e.target.value })
                  }
                />
              </div>
            ))}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              placeholder="What worked? What didn't?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Log Results
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
