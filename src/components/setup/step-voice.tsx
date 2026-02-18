"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import type { BrandProfileInput } from "@/lib/brand/defaults";

interface StepProps {
  data: BrandProfileInput;
  onChange: (updates: Partial<BrandProfileInput>) => void;
}

export function StepVoice({ data, onChange }: StepProps) {
  const [toneInput, setToneInput] = useState("");

  const toneKeywords = data.tone
    ? data.tone.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  function addToneKeyword(keyword: string) {
    const trimmed = keyword.trim();
    if (!trimmed) return;
    if (toneKeywords.includes(trimmed)) return;
    const updated = [...toneKeywords, trimmed];
    onChange({ tone: updated.join(", ") });
  }

  function removeToneKeyword(index: number) {
    const updated = toneKeywords.filter((_, i) => i !== index);
    onChange({ tone: updated.join(", ") });
  }

  function handleToneKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addToneKeyword(toneInput);
      setToneInput("");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Brand Voice</h3>
        <p className="text-sm text-muted-foreground">
          Tell Mo how your brand should sound.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personality</CardTitle>
          <CardDescription>
            If your brand were a person, how would they talk?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="voice">Voice Description</Label>
            <Textarea
              id="voice"
              placeholder='Like a savvy roommate who always knows the best deals'
              value={data.voice}
              onChange={(e) => onChange({ voice: e.target.value })}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tone Keywords</CardTitle>
          <CardDescription>
            Add words that describe your tone. Type and press Enter.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Input
              placeholder="e.g. friendly, professional, witty..."
              value={toneInput}
              onChange={(e) => setToneInput(e.target.value)}
              onKeyDown={handleToneKeyDown}
            />
          </div>
          {toneKeywords.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {toneKeywords.map((keyword, i) => (
                <Badge key={i} variant="secondary" className="gap-1 pr-1">
                  {keyword}
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="h-4 w-4 rounded-full"
                    onClick={() => removeToneKeyword(i)}
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
          <CardTitle>Brand Guidelines</CardTitle>
          <CardDescription>
            Content standards, visual style, and non-negotiable brand rules.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Always use sentence case. Never use exclamation marks. Avoid jargon..."
            value={data.brandGuidelines}
            onChange={(e) => onChange({ brandGuidelines: e.target.value })}
            rows={4}
          />
        </CardContent>
      </Card>
    </div>
  );
}
