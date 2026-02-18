"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, X } from "lucide-react";
import type { BrandProfileInput } from "@/lib/brand/defaults";

interface StepProps {
  data: BrandProfileInput;
  onChange: (updates: Partial<BrandProfileInput>) => void;
  activePlatforms: string[];
  onPlatformsChange: (platforms: string[]) => void;
}

const PLATFORMS = [
  "TikTok",
  "Instagram",
  "YouTube",
  "Email",
  "Blog",
  "Twitter",
] as const;

export function StepContent({
  data,
  onChange,
  activePlatforms,
  onPlatformsChange,
}: StepProps) {
  const [hashtagInput, setHashtagInput] = useState("");

  function updateMessagingPillar(index: number, value: string) {
    const updated = [...data.messagingPillars];
    updated[index] = value;
    onChange({ messagingPillars: updated });
  }

  function addMessagingPillar() {
    onChange({ messagingPillars: [...data.messagingPillars, ""] });
  }

  function removeMessagingPillar(index: number) {
    const updated = data.messagingPillars.filter((_, i) => i !== index);
    onChange({ messagingPillars: updated });
  }

  function updateContentPillar(
    index: number,
    field: "name" | "ratio" | "description",
    value: string | number
  ) {
    const updated = [...data.contentPillars];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ contentPillars: updated });
  }

  function addContentPillar() {
    onChange({
      contentPillars: [
        ...data.contentPillars,
        { name: "", ratio: 0, description: "" },
      ],
    });
  }

  function removeContentPillar(index: number) {
    const updated = data.contentPillars.filter((_, i) => i !== index);
    onChange({ contentPillars: updated });
  }

  function addHashtag(tag: string) {
    const trimmed = tag.trim();
    if (!trimmed) return;
    const formatted = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
    if (data.hashtags.includes(formatted)) return;
    onChange({ hashtags: [...data.hashtags, formatted] });
  }

  function removeHashtag(index: number) {
    const updated = data.hashtags.filter((_, i) => i !== index);
    onChange({ hashtags: updated });
  }

  function handleHashtagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addHashtag(hashtagInput);
      setHashtagInput("");
    }
  }

  function togglePlatform(platform: string) {
    if (activePlatforms.includes(platform)) {
      onPlatformsChange(activePlatforms.filter((p) => p !== platform));
    } else {
      onPlatformsChange([...activePlatforms, platform]);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Content Strategy</h3>
        <p className="text-sm text-muted-foreground">
          Define the pillars and structure of your content.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Messaging Pillars</CardTitle>
          <CardDescription>
            Core messages that underpin all your marketing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.messagingPillars.map((pillar, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Pillar {i + 1}
                </Label>
                <Textarea
                  placeholder="Describe a core message..."
                  value={pillar}
                  onChange={(e) => updateMessagingPillar(i, e.target.value)}
                  rows={2}
                />
              </div>
              <Button
                variant="ghost"
                size="icon-xs"
                className="mt-6"
                onClick={() => removeMessagingPillar(i)}
                disabled={data.messagingPillars.length <= 1}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addMessagingPillar}>
            <Plus className="mr-1 h-4 w-4" />
            Add pillar
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Content Pillars</CardTitle>
          <CardDescription>
            Categories of content and their target mix ratios.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.contentPillars.map((pillar, i) => (
            <Card key={i} className="py-4">
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">
                    Pillar {i + 1}
                  </Label>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => removeContentPillar(i)}
                    disabled={data.contentPillars.length <= 1}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-[1fr_80px] gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Name</Label>
                    <Input
                      placeholder="e.g. Education"
                      value={pillar.name}
                      onChange={(e) =>
                        updateContentPillar(i, "name", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Ratio %</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={pillar.ratio}
                      onChange={(e) =>
                        updateContentPillar(
                          i,
                          "ratio",
                          parseInt(e.target.value) || 0
                        )
                      }
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Description</Label>
                  <Textarea
                    placeholder="What kind of content falls under this pillar?"
                    value={pillar.description}
                    onChange={(e) =>
                      updateContentPillar(i, "description", e.target.value)
                    }
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
          <Button variant="outline" size="sm" onClick={addContentPillar}>
            <Plus className="mr-1 h-4 w-4" />
            Add content pillar
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hashtags</CardTitle>
          <CardDescription>
            Default hashtags for content. Type and press Enter to add.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="#YourBrand"
            value={hashtagInput}
            onChange={(e) => setHashtagInput(e.target.value)}
            onKeyDown={handleHashtagKeyDown}
          />
          {data.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {data.hashtags.map((tag, i) => (
                <Badge key={i} variant="secondary" className="gap-1 pr-1">
                  {tag}
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="h-4 w-4 rounded-full"
                    onClick={() => removeHashtag(i)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active Platforms</CardTitle>
          <CardDescription>
            Where does your brand publish content?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((platform) => {
              const active = activePlatforms.includes(platform);
              return (
                <Button
                  key={platform}
                  variant={active ? "default" : "outline"}
                  size="sm"
                  onClick={() => togglePlatform(platform)}
                >
                  {platform}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
