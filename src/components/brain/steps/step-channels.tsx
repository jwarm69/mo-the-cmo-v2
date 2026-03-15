"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X } from "lucide-react";

export interface ChannelEntry {
  name: string;
  type: string;
  frequency: string;
  targetIcps: string;
  metrics: string;
  budget: string;
}

const EMPTY_CHANNEL: ChannelEntry = {
  name: "",
  type: "social",
  frequency: "",
  targetIcps: "",
  metrics: "",
  budget: "",
};

interface StepChannelsProps {
  entries: ChannelEntry[];
  onChange: (entries: ChannelEntry[]) => void;
}

export function StepChannels({ entries, onChange }: StepChannelsProps) {
  function addEntry() {
    onChange([...entries, { ...EMPTY_CHANNEL }]);
  }

  function removeEntry(index: number) {
    onChange(entries.filter((_, i) => i !== index));
  }

  function updateEntry(index: number, updates: Partial<ChannelEntry>) {
    const next = [...entries];
    next[index] = { ...next[index], ...updates };
    onChange(next);
  }

  return (
    <div className="space-y-4">
      {entries.map((entry, i) => (
        <div key={i} className="space-y-3 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Channel {i + 1}</span>
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
              <Label>Channel Name</Label>
              <Input
                placeholder="e.g., TikTok, Email Newsletter"
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
                  <SelectItem value="social">Social Media</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="paid">Paid Ads</SelectItem>
                  <SelectItem value="seo">SEO / Content</SelectItem>
                  <SelectItem value="events">Events</SelectItem>
                  <SelectItem value="partnerships">Partnerships</SelectItem>
                  <SelectItem value="direct">Direct Outreach</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Posting Frequency</Label>
              <Input
                placeholder="e.g., 3x/week, daily, monthly"
                value={entry.frequency}
                onChange={(e) => updateEntry(i, { frequency: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Budget</Label>
              <Input
                placeholder="e.g., $500/mo, organic only"
                value={entry.budget}
                onChange={(e) => updateEntry(i, { budget: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Target ICPs</Label>
            <Input
              placeholder="Which customer segments does this channel reach?"
              value={entry.targetIcps}
              onChange={(e) => updateEntry(i, { targetIcps: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Key Metrics</Label>
            <Input
              placeholder="e.g., engagement rate, email open rate, CTR"
              value={entry.metrics}
              onChange={(e) => updateEntry(i, { metrics: e.target.value })}
            />
          </div>
        </div>
      ))}

      <Button variant="outline" onClick={addEntry} className="w-full">
        <Plus className="mr-2 h-4 w-4" />
        Add Another Channel
      </Button>
    </div>
  );
}

export function channelsToEntries(entries: ChannelEntry[]) {
  return entries
    .filter((e) => e.name.trim())
    .map((e) => ({
      type: "channel_insight" as const,
      title: `Channel: ${e.name}`,
      content: [
        `Channel: ${e.name} (${e.type})`,
        e.frequency ? `Frequency: ${e.frequency}` : null,
        e.targetIcps ? `Target ICPs: ${e.targetIcps}` : null,
        e.metrics ? `Key metrics: ${e.metrics}` : null,
        e.budget ? `Budget: ${e.budget}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
      source: "brain_wizard",
      metadata: { ...e },
    }));
}
