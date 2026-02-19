"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Plus, Loader2 } from "lucide-react";
import type { Platform } from "@/lib/types";

const PLATFORM_OPTIONS: { value: Platform | ""; label: string }[] = [
  { value: "", label: "Any" },
  { value: "tiktok", label: "TikTok" },
  { value: "instagram", label: "Instagram" },
  { value: "twitter", label: "Twitter" },
  { value: "email", label: "Email" },
  { value: "blog", label: "Blog" },
];

export function IdeaCapture({ onCaptured }: { onCaptured?: () => void }) {
  const [text, setText] = useState("");
  const [platform, setPlatform] = useState<Platform | "">("");
  const [saving, setSaving] = useState(false);

  const handleCapture = async () => {
    if (!text.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.trim(),
          platform: platform || undefined,
        }),
      });
      if (res.ok) {
        setText("");
        setPlatform("");
        onCaptured?.();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleCapture();
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-yellow-500" />
          Quick Idea Capture
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Input
            placeholder="Capture a content idea..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1"
          />
          <div className="flex gap-1">
            {PLATFORM_OPTIONS.map((p) => (
              <Badge
                key={p.value || "any"}
                variant={platform === p.value ? "default" : "outline"}
                className="cursor-pointer text-xs whitespace-nowrap"
                onClick={() => setPlatform(p.value)}
              >
                {p.label}
              </Badge>
            ))}
          </div>
          <Button
            size="sm"
            onClick={handleCapture}
            disabled={saving || !text.trim()}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
