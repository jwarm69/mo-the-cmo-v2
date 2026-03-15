"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X } from "lucide-react";

export interface CompetitorEntry {
  name: string;
  type: string;
  strengths: string;
  weaknesses: string;
  pricing: string;
}

const EMPTY_COMPETITOR: CompetitorEntry = {
  name: "",
  type: "direct",
  strengths: "",
  weaknesses: "",
  pricing: "",
};

interface StepCompetitorsProps {
  entries: CompetitorEntry[];
  onChange: (entries: CompetitorEntry[]) => void;
}

export function StepCompetitors({ entries, onChange }: StepCompetitorsProps) {
  function addEntry() {
    onChange([...entries, { ...EMPTY_COMPETITOR }]);
  }

  function removeEntry(index: number) {
    onChange(entries.filter((_, i) => i !== index));
  }

  function updateEntry(index: number, updates: Partial<CompetitorEntry>) {
    const next = [...entries];
    next[index] = { ...next[index], ...updates };
    onChange(next);
  }

  return (
    <div className="space-y-4">
      {entries.map((entry, i) => (
        <div key={i} className="space-y-3 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Competitor {i + 1}</span>
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
              <Label>Name</Label>
              <Input
                placeholder="e.g., DoorDash"
                value={entry.name}
                onChange={(e) => updateEntry(i, { name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={entry.type}
                onValueChange={(v) => updateEntry(i, { type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="direct">Direct</SelectItem>
                  <SelectItem value="indirect">Indirect</SelectItem>
                  <SelectItem value="aspirational">Aspirational</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Strengths</Label>
            <Textarea
              placeholder="What do they do well?"
              value={entry.strengths}
              onChange={(e) => updateEntry(i, { strengths: e.target.value })}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Weaknesses</Label>
            <Textarea
              placeholder="Where do they fall short?"
              value={entry.weaknesses}
              onChange={(e) => updateEntry(i, { weaknesses: e.target.value })}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Pricing / Model</Label>
            <Input
              placeholder="e.g., $9.99/mo subscription"
              value={entry.pricing}
              onChange={(e) => updateEntry(i, { pricing: e.target.value })}
            />
          </div>
        </div>
      ))}

      <Button variant="outline" onClick={addEntry} className="w-full">
        <Plus className="mr-2 h-4 w-4" />
        Add Another Competitor
      </Button>
    </div>
  );
}

export function competitorsToEntries(entries: CompetitorEntry[]) {
  return entries
    .filter((e) => e.name.trim())
    .map((e) => ({
      type: "market_insight" as const,
      title: `Competitor: ${e.name}`,
      content: [
        `Competitor: ${e.name} (${e.type})`,
        e.strengths ? `Strengths: ${e.strengths}` : null,
        e.weaknesses ? `Weaknesses: ${e.weaknesses}` : null,
        e.pricing ? `Pricing: ${e.pricing}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
      source: "brain_wizard",
      metadata: { ...e },
    }));
}
