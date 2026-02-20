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
  id: string;
  platform: string;
  dayOfWeek: number;
  timeSlot: string;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const PLATFORMS = [
  { value: "tiktok", label: "TikTok" },
  { value: "instagram", label: "Instagram" },
  { value: "twitter", label: "Twitter/X" },
  { value: "email", label: "Email" },
  { value: "blog", label: "Blog" },
];

function platformLabel(value: string): string {
  return PLATFORMS.find((p) => p.value === value)?.label || value;
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
        const rows = (await res.json()) as SlotRow[];
        setSlots(rows);
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
        toast.success("Loaded recommended cadence");
        await fetchSlots();
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
      if (res.ok) await fetchSlots();
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
      setSlots((prev) => prev.map((slot) => (slot.id === id ? { ...slot, ...updates } : slot)));
    }
  };

  const handleDeleteSlot = async (id: string) => {
    const res = await fetch("/api/calendar-slots", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      setSlots((prev) => prev.filter((slot) => slot.id !== id));
    }
  };

  const slotsByDay = new Map<number, SlotRow[]>();
  for (const slot of slots) {
    const existing = slotsByDay.get(slot.dayOfWeek) || [];
    existing.push(slot);
    slotsByDay.set(slot.dayOfWeek, existing);
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
          Weekly Cadence
        </CardTitle>
        <CardDescription>
          Plan your posting slots. Week generation follows this schedule.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {slots.length === 0 && (
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground mb-3">
              No cadence configured yet.
            </p>
            <Button onClick={handleSeedDefaults} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
              Load Recommended Defaults
            </Button>
          </div>
        )}

        {slots.length > 0 && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{slots.length} posts per week</Badge>
            </div>
            {DAY_ORDER.map((day) => {
              const daySlots = slotsByDay.get(day) || [];
              return (
                <div key={day} className="rounded-lg border p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-medium">{DAY_NAMES[day]}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAddSlot(day)}
                      disabled={saving}
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Add
                    </Button>
                  </div>
                  {daySlots.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No posts</p>
                  ) : (
                    <div className="space-y-2">
                      {daySlots.map((slot) => (
                        <div key={slot.id} className="flex items-center gap-2">
                          <Input
                            type="time"
                            value={slot.timeSlot}
                            onChange={(e) => handleUpdateSlot(slot.id, { timeSlot: e.target.value })}
                            className="w-[110px]"
                          />
                          <Select
                            value={slot.platform}
                            onValueChange={(platform) => handleUpdateSlot(slot.id, { platform })}
                          >
                            <SelectTrigger className="w-[130px]">
                              <SelectValue>{platformLabel(slot.platform)}</SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {PLATFORMS.map((platform) => (
                                <SelectItem key={platform.value} value={platform.value}>
                                  {platform.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => handleDeleteSlot(slot.id)}
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
