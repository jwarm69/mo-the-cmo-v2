"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X } from "lucide-react";

export interface ContentPlanEntry {
  name: string;
  format: string;
  hook: string;
  goal: string;
  frequency: string;
}

const EMPTY_PLAN: ContentPlanEntry = {
  name: "",
  format: "",
  hook: "",
  goal: "",
  frequency: "",
};

interface StepContentPlansProps {
  entries: ContentPlanEntry[];
  onChange: (entries: ContentPlanEntry[]) => void;
}

export function StepContentPlans({ entries, onChange }: StepContentPlansProps) {
  function addEntry() {
    onChange([...entries, { ...EMPTY_PLAN }]);
  }

  function removeEntry(index: number) {
    onChange(entries.filter((_, i) => i !== index));
  }

  function updateEntry(index: number, updates: Partial<ContentPlanEntry>) {
    const next = [...entries];
    next[index] = { ...next[index], ...updates };
    onChange(next);
  }

  return (
    <div className="space-y-4">
      {entries.map((entry, i) => (
        <div key={i} className="space-y-3 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Content Series {i + 1}</span>
            {entries.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => removeEntry(i)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Series Name</Label>
              <Input
                placeholder="e.g., Monday Motivation, Weekly Tips"
                value={entry.name}
                onChange={(e) => updateEntry(i, { name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Format</Label>
              <Input
                placeholder="e.g., short video, carousel, thread"
                value={entry.format}
                onChange={(e) => updateEntry(i, { format: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Hook / Angle</Label>
            <Textarea
              placeholder="What makes this series engaging? What's the recurring hook?"
              value={entry.hook}
              onChange={(e) => updateEntry(i, { hook: e.target.value })}
              rows={2}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Goal</Label>
              <Input
                placeholder="e.g., build trust, drive signups"
                value={entry.goal}
                onChange={(e) => updateEntry(i, { goal: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Input
                placeholder="e.g., weekly, biweekly"
                value={entry.frequency}
                onChange={(e) => updateEntry(i, { frequency: e.target.value })}
              />
            </div>
          </div>
        </div>
      ))}

      <Button variant="outline" onClick={addEntry} className="w-full">
        <Plus className="mr-2 h-4 w-4" />
        Add Another Content Series
      </Button>
    </div>
  );
}

export function contentPlansToEntries(entries: ContentPlanEntry[]) {
  return entries
    .filter((e) => e.name.trim())
    .map((e) => ({
      type: "plan_context" as const,
      title: `Content Series: ${e.name}`,
      content: [
        `Series: ${e.name}`,
        e.format ? `Format: ${e.format}` : null,
        e.hook ? `Hook: ${e.hook}` : null,
        e.goal ? `Goal: ${e.goal}` : null,
        e.frequency ? `Frequency: ${e.frequency}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
      source: "brain_wizard",
      metadata: { ...e },
    }));
}
