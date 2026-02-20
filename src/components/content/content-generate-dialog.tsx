"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { Plus, Loader2 } from "lucide-react";
import type { Platform } from "@/lib/types";

const PLATFORMS: { value: Platform; label: string }[] = [
  { value: "tiktok", label: "TikTok" },
  { value: "instagram", label: "Instagram" },
  { value: "twitter", label: "Twitter/X" },
  { value: "email", label: "Email" },
  { value: "blog", label: "Blog" },
];

export interface ContentPillar {
  name: string;
  ratio: number;
}

export function ContentGenerateDialog({
  onGenerated,
  pillars,
}: {
  onGenerated?: () => void;
  pillars?: ContentPillar[];
}) {
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<Platform>("tiktok");
  const [topic, setTopic] = useState("");
  const [pillar, setPillar] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/content/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, topic, pillar: pillar || undefined, useAgentLoop: true }),
      });
      if (res.ok) {
        setOpen(false);
        setTopic("");
        setPillar("");
        onGenerated?.();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Content
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate Content</DialogTitle>
          <DialogDescription>
            Choose a platform, enter a topic, and Mo will generate
            brand-aligned content.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Platform</Label>
            <Select
              value={platform}
              onValueChange={(v) => setPlatform(v as Platform)}
            >
              <SelectTrigger className="w-full">
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
          </div>
          <div className="space-y-2">
            <Label>Topic</Label>
            <Input
              placeholder="e.g., Saving money on food this semester"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Content Pillar (optional)</Label>
            <Select value={pillar} onValueChange={setPillar}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Auto-select" />
              </SelectTrigger>
              <SelectContent>
                {pillars && pillars.length > 0 ? (
                  pillars.map((p) => (
                    <SelectItem key={p.name} value={p.name}>
                      {p.name} ({p.ratio}%)
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="General">General</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleGenerate}
            disabled={loading || !topic.trim()}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
