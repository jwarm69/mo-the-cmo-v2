"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Sparkles, AlertTriangle } from "lucide-react";

interface PlannedSlot {
  slotIndex: number;
  platform: string;
  dayOfWeek: number;
  dayName: string;
  date: string;
  timeSlot: string;
  topic: string;
  pillar: string;
  brief: string;
  campaignTie: string | null;
  ideaSource: string | null;
}

interface WeekPlanPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: PlannedSlot[] | null;
  week: string;
  totalSlots: number;
  availableSlots: number;
  skippedSlots: number;
  generating: boolean;
  onConfirm: () => void;
}

const PLATFORM_COLORS: Record<string, string> = {
  tiktok: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
  instagram: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  twitter: "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200",
  facebook: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  linkedin: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  email: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  blog: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
};

export function WeekPlanPreview({
  open,
  onOpenChange,
  plan,
  week,
  totalSlots,
  availableSlots,
  skippedSlots,
  generating,
  onConfirm,
}: WeekPlanPreviewProps) {
  // Group plan items by day
  const byDay = new Map<string, PlannedSlot[]>();
  if (plan) {
    for (const item of plan) {
      const key = `${item.dayName} ${item.date}`;
      const existing = byDay.get(key) || [];
      existing.push(item);
      byDay.set(key, existing);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Weekly Content Plan</DialogTitle>
          <DialogDescription>
            Week of {week}
            {skippedSlots > 0 && (
              <span className="ml-2 text-amber-600">
                ({skippedSlots} slot{skippedSlots > 1 ? "s" : ""} already filled)
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {skippedSlots > 0 && (
          <div className="flex items-start gap-2 rounded-md bg-amber-50 dark:bg-amber-950 p-3 text-sm text-amber-800 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              {skippedSlots} of {totalSlots} cadence slots already have content
              and will be skipped. Only {availableSlots} new piece{availableSlots !== 1 ? "s" : ""} will be generated.
            </span>
          </div>
        )}

        <ScrollArea className="max-h-[50vh] pr-4">
          <div className="space-y-4">
            {Array.from(byDay.entries()).map(([dayLabel, items]) => (
              <div key={dayLabel}>
                <h4 className="text-sm font-semibold text-muted-foreground mb-2">
                  {dayLabel}
                </h4>
                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border p-3 space-y-1"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="secondary"
                          className={PLATFORM_COLORS[item.platform] || ""}
                        >
                          {item.platform}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {item.timeSlot}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {item.pillar}
                        </Badge>
                        {item.campaignTie && (
                          <Badge variant="default" className="text-xs">
                            {item.campaignTie}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium">{item.topic}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.brief}
                      </p>
                      {item.ideaSource && (
                        <p className="text-xs text-blue-600 dark:text-blue-400">
                          From idea: &quot;{item.ideaSource}&quot;
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={generating}>
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating {availableSlots} pieces...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate {availableSlots} pieces
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
