"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X } from "lucide-react";

export interface AudienceEntry {
  name: string;
  emotion: string;
  painPoints: string;
  hooks: string;
  channels: string;
}

const EMPTY_AUDIENCE: AudienceEntry = {
  name: "",
  emotion: "",
  painPoints: "",
  hooks: "",
  channels: "",
};

interface StepAudienceProps {
  entries: AudienceEntry[];
  onChange: (entries: AudienceEntry[]) => void;
}

export function StepAudience({ entries, onChange }: StepAudienceProps) {
  function addEntry() {
    onChange([...entries, { ...EMPTY_AUDIENCE }]);
  }

  function removeEntry(index: number) {
    onChange(entries.filter((_, i) => i !== index));
  }

  function updateEntry(index: number, updates: Partial<AudienceEntry>) {
    const next = [...entries];
    next[index] = { ...next[index], ...updates };
    onChange(next);
  }

  return (
    <div className="space-y-4">
      {entries.map((entry, i) => (
        <div key={i} className="space-y-3 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Customer Segment {i + 1}</span>
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

          <div className="space-y-2">
            <Label>Segment Name</Label>
            <Input
              placeholder="e.g., Budget-Conscious College Students"
              value={entry.name}
              onChange={(e) => updateEntry(i, { name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Core Emotion / Motivation</Label>
            <Input
              placeholder="e.g., Want to eat well without breaking the bank"
              value={entry.emotion}
              onChange={(e) => updateEntry(i, { emotion: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Pain Points</Label>
            <Textarea
              placeholder="What frustrates them? What problems do they face?"
              value={entry.painPoints}
              onChange={(e) => updateEntry(i, { painPoints: e.target.value })}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>What hooks them?</Label>
            <Input
              placeholder="e.g., Free meal plans, quick recipes, budget tips"
              value={entry.hooks}
              onChange={(e) => updateEntry(i, { hooks: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Where do they hang out?</Label>
            <Input
              placeholder="e.g., TikTok, Instagram, Reddit"
              value={entry.channels}
              onChange={(e) => updateEntry(i, { channels: e.target.value })}
            />
          </div>
        </div>
      ))}

      <Button variant="outline" onClick={addEntry} className="w-full">
        <Plus className="mr-2 h-4 w-4" />
        Add Another Segment
      </Button>
    </div>
  );
}

export function audienceToEntries(entries: AudienceEntry[]) {
  return entries
    .filter((e) => e.name.trim())
    .map((e) => ({
      type: "icp_insight" as const,
      title: `ICP: ${e.name}`,
      content: [
        `Segment: ${e.name}`,
        e.emotion ? `Core emotion: ${e.emotion}` : null,
        e.painPoints ? `Pain points: ${e.painPoints}` : null,
        e.hooks ? `Hooks: ${e.hooks}` : null,
        e.channels ? `Channels: ${e.channels}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
      source: "brain_wizard",
      metadata: { ...e },
    }));
}
