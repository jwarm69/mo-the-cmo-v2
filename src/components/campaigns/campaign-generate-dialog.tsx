"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles } from "lucide-react";
import type { Platform } from "@/lib/types";

interface Campaign {
  id: string;
  name: string;
  platforms: string[] | null;
  objective: string | null;
}

const PLATFORM_LABELS: Record<string, string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
  twitter: "Twitter/X",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  email: "Email",
  blog: "Blog",
};

export function CampaignGenerateDialog({
  campaign,
  open,
  onOpenChange,
  onGenerated,
}: {
  campaign: Campaign;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerated?: () => void;
}) {
  const [topic, setTopic] = useState(campaign.objective || "");
  const [loading, setLoading] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(
    campaign.platforms || []
  );

  const togglePlatform = (p: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const handleGenerate = async () => {
    if (!topic.trim() || selectedPlatforms.length === 0) return;
    setLoading(true);
    try {
      const results = await Promise.all(
        selectedPlatforms.map((platform) =>
          fetch("/api/content/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              platform: platform as Platform,
              topic,
              campaignId: campaign.id,
            }),
          })
        )
      );
      if (results.every((r) => r.ok)) {
        onOpenChange(false);
        onGenerated?.();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate Campaign Content</DialogTitle>
          <DialogDescription>
            Generate content for &ldquo;{campaign.name}&rdquo;. Select
            platforms and provide a topic.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Platforms</Label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(PLATFORM_LABELS).map(([value, label]) => (
                <Badge
                  key={value}
                  variant={
                    selectedPlatforms.includes(value) ? "default" : "outline"
                  }
                  className="cursor-pointer"
                  onClick={() => togglePlatform(value)}
                >
                  {label}
                </Badge>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Topic / Brief</Label>
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="What should the content be about?"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={loading || !topic.trim() || selectedPlatforms.length === 0}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating {selectedPlatforms.length} piece
                {selectedPlatforms.length !== 1 ? "s" : ""}...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate ({selectedPlatforms.length})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
