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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import type { ContentItem, Platform } from "@/lib/types";

const PLATFORMS: { value: Platform; label: string }[] = [
  { value: "tiktok", label: "TikTok" },
  { value: "instagram", label: "Instagram" },
  { value: "twitter", label: "Twitter/X" },
  { value: "email", label: "Email" },
  { value: "blog", label: "Blog" },
];

export function RepurposeDialog({
  item,
  open,
  onOpenChange,
  onRepurposed,
}: {
  item: ContentItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRepurposed?: () => void;
}) {
  const [targetPlatform, setTargetPlatform] = useState<Platform | "">("");
  const [loading, setLoading] = useState(false);

  const availablePlatforms = PLATFORMS.filter((p) => p.value !== item.platform);

  const handleRepurpose = async () => {
    if (!targetPlatform) return;
    setLoading(true);
    try {
      const res = await fetch("/api/content/repurpose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceContentId: item.id,
          targetPlatform,
        }),
      });
      if (res.ok) {
        onOpenChange(false);
        setTargetPlatform("");
        onRepurposed?.();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Repurpose Content</DialogTitle>
          <DialogDescription>
            Adapt this {item.platform} content for a different platform. Mo will
            rewrite it to match the target platform&apos;s best practices.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="rounded-md border p-3 text-sm">
            <p className="font-medium mb-1">{item.hook || "Untitled"}</p>
            <p className="text-muted-foreground line-clamp-2">{item.body}</p>
          </div>
          <div className="space-y-2">
            <Label>Target Platform</Label>
            <Select
              value={targetPlatform}
              onValueChange={(v) => setTargetPlatform(v as Platform)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose platform" />
              </SelectTrigger>
              <SelectContent>
                {availablePlatforms.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleRepurpose}
            disabled={loading || !targetPlatform}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Repurposing...
              </>
            ) : (
              "Repurpose"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
