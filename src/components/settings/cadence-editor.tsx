"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Calendar, Loader2, Plus, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface SlotRow {
  id?: string;
  platform: string;
  dayOfWeek: number;
  timeSlot: string;
  contentPillar: string | null;
  isNew?: boolean;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const PLATFORMS = [
  { value: "tiktok", label: "TikTok" },
  { value: "instagram", label: "Instagram" },
  { value: "twitter", label: "Twitter/X" },
  { value: "email", label: "Email" },
  { value: "blog", label: "Blog" },
];

// Order days Mon-Sun for display
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

function platformLabel(value: string): string {
  return PLATFORMS.find((p) => p.value === value)?.label || value;
}

function platformColor(platform: string): string {
  switch (platform) {
    case "tiktok": return "bg-pink-500/10 text-pink-700 dark:text-pink-400";
    case "instagram": return "bg-purple-500/10 text-purple-700 dark:text-purple-400";
    case "twitter": return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
    case "email": return "bg-amber-500/10 text-amber-700 dark:text-amber-400";
    case "blog": return "bg-green-500/10 text-green-700 dark:text-green-400";
    default: return "";
  }
}

export function CadenceEditor() {
  const [slots, setSlots] = useState<SlotRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fetchSlots = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/calendar-slots");
      if (res.ok) {
        const data = await res.json();
        setSlots(data.length > 0 ? data : []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  const handleSeedDefaults = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/calendar-slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slots: [
            { platform: "tiktok", dayOfWeek: 1, timeSlot: "12:00" },
            { platform: "instagram", dayOfWeek: 1, timeSlot: "18:00" },
            { platform: "tiktok", dayOfWeek: 2, timeSlot: "12:00" },
            { platform: "twitter", dayOfWeek: 2, timeSlot: "17:00" },
            { platform: "tiktok", dayOfWeek: 3, timeSlot: "12:00" },
            { platform: "instagram", dayOfWeek: 3, timeSlot: "18:00" },
            { platform: "tiktok", dayOfWeek: 4, timeSlot: "12:00" },
            { platform: "twitter", dayOfWeek: 4, timeSlot: "17:00" },
            { platform: "tiktok", dayOfWeek: 5, timeSlot: "12:00" },
            { platform: "instagram", dayOfWeek: 5, timeSlot: "18:00" },
            { platform: "tiktok", dayOfWeek: 6, timeSlot: "11:00" },
            { platform: "instagram", dayOfWeek: 6, timeSlot: "15:00" },
            { platform: "tiktok", dayOfWeek: 0, timeSlot: "14:00" },
            { platform: "instagram", dayOfWeek: 0, timeSlot: "18:00" },
          ],
        }),
      });
      if (res.ok) {
        toast.success("Default cadence loaded");
        fetchSlots();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleAddSlot = async (dayOfWeek: number) => {
    setSaving(true);
    try {
      const res = await fetch("/api/calendar-slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: "tiktok", dayOfWeek, timeSlot: "12:00" }),
      });
      if (res.ok) {
        fetchSlots();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateSlot = async (id: string, updates: Partial<SlotRow>) => {
    const res = await fetch("/api/calendar-slots", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    });
    if (res.ok) {
      setSlots((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
      );
    }
  };

  const handleDeleteSlot = async (id: string) => {
    const res = await fetch("/api/calendar-slots", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      setSlots((prev) => prev.filter((s) => s.id !== id));
      toast.success("Slot removed");
    }
  };

  // Group slots by day
  const slotsByDay = new Map<number, SlotRow[]>();
  for (const slot of slots) {
    const existing = slotsByDay.get(slot.dayOfWeek) || [];
    existing.push(slot);
    slotsByDay.set(slot.dayOfWeek, existing);
  }

  // Count per platform
  const platformCounts: Record<string, number> = {};
  for (const slot of slots) {
    platformCounts[slot.platform] = (platformCounts[slot.platform] || 0) + 1;
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Posting Cadence
        </CardTitle>
        <CardDescription>
          Define when and where you post each week. Generate Week uses this schedule.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary badges */}
        {slots.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{slots.length} posts/week</Badge>
            {Object.entries(platformCounts).map(([platform, count]) => (
              <Badge key={platform} variant="secondary" className={platformColor(platform)}>
                {platformLabel(platform)}: {count}x
              </Badge>
            ))}
          </div>
        )}

        {/* Empty state */}
        {slots.length === 0 && (
          <div className="flex flex-col items-center py-8 gap-4">
            <Calendar className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium">No posting cadence configured</p>
              <p className="text-sm text-muted-foreground mt-1">
                Set up your weekly posting schedule, or start with our recommended defaults.
              </p>
            </div>
            <Button onClick={handleSeedDefaults} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
              Load Recommended Defaults
            </Button>
          </div>
        )}

        {/* Day-by-day editor */}
        {slots.length > 0 && (
          <div className="space-y-3">
            {DAY_ORDER.map((day) => {
              const daySlots = slotsByDay.get(day) || [];
              return (
                <div key={day} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{DAY_NAMES[day]}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAddSlot(day)}
                      disabled={saving}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  </div>
                  {daySlots.length === 0 ? (
                    <p className="text-xs text-muted-foreground pl-1">No posts scheduled</p>
                  ) : (
                    <div className="space-y-2">
                      {daySlots.map((slot) => (
                        <div key={slot.id} className="flex items-center gap-2">
                          <Input
                            type="time"
                            value={slot.timeSlot}
                            onChange={(e) =>
                              slot.id && handleUpdateSlot(slot.id, { timeSlot: e.target.value })
                            }
                            className="w-[110px] text-sm"
                          />
                          <Select
                            value={slot.platform}
                            onValueChange={(val) =>
                              slot.id && handleUpdateSlot(slot.id, { platform: val })
                            }
                          >
                            <SelectTrigger className="w-[130px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PLATFORMS.map((p) => (
                                <SelectItem key={p.value} value={p.value}>
                                  {p.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive h-8 w-8 p-0"
                            onClick={() => slot.id && handleDeleteSlot(slot.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
