"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Copy, CheckCircle2, AlarmClockOff } from "lucide-react";
import { toast } from "sonner";
import type { ContentItem } from "@/lib/types";
import { formatForClipboard } from "@/lib/content/formatters";

const PLATFORM_COLORS: Record<string, string> = {
  tiktok: "bg-pink-500/10 text-pink-700 border-pink-200",
  instagram: "bg-purple-500/10 text-purple-700 border-purple-200",
  twitter: "bg-blue-500/10 text-blue-700 border-blue-200",
  email: "bg-green-500/10 text-green-700 border-green-200",
  blog: "bg-orange-500/10 text-orange-700 border-orange-200",
};

function useCountdown(scheduledDate?: string, scheduledTime?: string) {
  const [label, setLabel] = useState("");

  useEffect(() => {
    if (!scheduledDate) {
      setLabel("");
      return;
    }

    function compute() {
      const dateStr = scheduledTime
        ? `${scheduledDate}T${scheduledTime}`
        : `${scheduledDate}T00:00:00`;
      const target = new Date(dateStr).getTime();
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        setLabel("Now");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);

      if (days > 0) {
        setLabel(`${days}d ${hours}h`);
      } else if (hours > 0) {
        setLabel(`${hours}h ${minutes}m`);
      } else {
        setLabel(`${minutes}m`);
      }
    }

    compute();
    const interval = setInterval(compute, 60_000);
    return () => clearInterval(interval);
  }, [scheduledDate, scheduledTime]);

  return label;
}

export function QueueItem({
  item,
  onUpdate,
}: {
  item: ContentItem;
  onUpdate: () => void;
}) {
  const [acting, setActing] = useState(false);
  const countdown = useCountdown(item.scheduledDate, item.scheduledTime);

  const handleCopy = async () => {
    const text = formatForClipboard(item);
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard", {
        description: `Formatted for ${item.platform}`,
      });
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleAction = async (action: "publish" | "snooze") => {
    setActing(true);
    try {
      const res = await fetch(`/api/content/${item.id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        toast.success(
          action === "publish" ? "Marked as published" : "Snoozed for 24 hours"
        );
        onUpdate();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || `Failed to ${action}`);
      }
    } catch {
      toast.error(`Failed to ${action}`);
    } finally {
      setActing(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Badge
            variant="outline"
            className={PLATFORM_COLORS[item.platform] || ""}
          >
            {item.platform}
          </Badge>
          <Badge variant="secondary">{item.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {item.hook && (
          <p className="text-sm font-medium line-clamp-2">{item.hook}</p>
        )}

        {item.scheduledDate && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>
              {item.scheduledDate}
              {item.scheduledTime ? ` at ${item.scheduledTime}` : ""}
            </span>
            {countdown && (
              <Badge variant="outline" className="ml-auto text-xs">
                {countdown}
              </Badge>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <Button size="sm" variant="outline" onClick={handleCopy}>
            <Copy className="mr-1 h-3 w-3" />
            Copy
          </Button>
          <Button
            size="sm"
            variant="default"
            disabled={acting}
            onClick={() => handleAction("publish")}
          >
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Mark Published
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={acting}
            onClick={() => handleAction("snooze")}
          >
            <AlarmClockOff className="mr-1 h-3 w-3" />
            Snooze
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
