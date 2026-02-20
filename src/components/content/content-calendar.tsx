"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ContentItem } from "@/lib/types";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const PLATFORM_COLORS: Record<string, string> = {
  tiktok: "bg-pink-500/10 text-pink-700 border-pink-200",
  instagram: "bg-purple-500/10 text-purple-700 border-purple-200",
  twitter: "bg-blue-500/10 text-blue-700 border-blue-200",
  email: "bg-green-500/10 text-green-700 border-green-200",
  blog: "bg-orange-500/10 text-orange-700 border-orange-200",
};

function getWeekDates(): { label: string; dateStr: string }[] {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));

  return DAY_NAMES.map((name, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return {
      label: `${name} ${d.getMonth() + 1}/${d.getDate()}`,
      dateStr: d.toISOString().split("T")[0],
    };
  });
}

export function ContentCalendar({ items }: { items: ContentItem[] }) {
  const week = getWeekDates();

  const grouped = new Map<string, ContentItem[]>();
  for (const day of week) {
    grouped.set(day.dateStr, []);
  }
  for (const item of items) {
    if (item.scheduledDate && grouped.has(item.scheduledDate)) {
      grouped.get(item.scheduledDate)!.push(item);
    }
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
      {week.map((day) => {
        const dayItems = grouped.get(day.dateStr) || [];
        return (
          <Card key={day.dateStr} className="min-h-[120px] md:min-h-[200px]">
            <CardHeader className="pb-2 px-3 pt-3">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {day.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3 space-y-2">
              {dayItems.length === 0 && (
                <p className="text-xs text-muted-foreground italic">
                  No content
                </p>
              )}
              {dayItems
                .sort((a, b) =>
                  (a.scheduledTime || "").localeCompare(b.scheduledTime || "")
                )
                .map((item) => (
                  <div
                    key={item.id}
                    className="rounded-md border p-2 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1 py-0 ${PLATFORM_COLORS[item.platform] || ""}`}
                      >
                        {item.platform}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {item.scheduledTime}
                      </span>
                    </div>
                    <p className="text-xs line-clamp-2">{item.topic}</p>
                  </div>
                ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
