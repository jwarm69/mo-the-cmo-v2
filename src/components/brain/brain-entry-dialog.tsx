"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { toast } from "sonner";
import type { BrainEntry } from "./brain-entry-card";

const CONTEXT_TYPES = [
  { value: "audience_insight", label: "Audience Insight" },
  { value: "icp_insight", label: "ICP / Customer Profile" },
  { value: "market_insight", label: "Market / Competitor" },
  { value: "channel_insight", label: "Channel Strategy" },
  { value: "strategy_decision", label: "Strategy Decision" },
  { value: "plan_context", label: "Content Plan" },
  { value: "product_info", label: "Product Info" },
  { value: "business_info", label: "Business Info" },
  { value: "brand_voice", label: "Brand Voice" },
  { value: "performance_insight", label: "Performance Insight" },
  { value: "goal_context", label: "Goal Context" },
  { value: "positioning_insight", label: "Positioning" },
];

interface BrainEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: BrainEntry | null;
  onSaved: () => void;
}

export function BrainEntryDialog({
  open,
  onOpenChange,
  entry,
  onSaved,
}: BrainEntryDialogProps) {
  const isEditing = !!entry;
  const [type, setType] = useState("audience_insight");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [confidence, setConfidence] = useState(1.0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (entry) {
      setType(entry.type);
      setTitle(entry.title);
      setContent(entry.content);
      setConfidence(entry.confidence);
    } else {
      setType("audience_insight");
      setTitle("");
      setContent("");
      setConfidence(1.0);
    }
  }, [entry, open]);

  async function handleSave() {
    if (!title.trim() || !content.trim()) {
      toast.error("Title and content are required");
      return;
    }

    setSaving(true);
    try {
      if (isEditing) {
        const res = await fetch(`/api/brain/entries/${entry.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, title, content, confidence }),
        });
        if (!res.ok) throw new Error("Failed to update entry");
        toast.success("Entry updated");
      } else {
        const res = await fetch("/api/brain/entries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, title, content, confidence, source: "manual" }),
        });
        if (!res.ok) throw new Error("Failed to create entry");
        toast.success("Entry added to Brain");
      }
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Entry" : "Add Brain Entry"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update this knowledge entry. Mo will use the updated version."
              : "Add knowledge to Mo's Brain. This will be used in all content generation."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="entry-type">Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="entry-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTEXT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="entry-title">Title</Label>
            <Input
              id="entry-title"
              placeholder="e.g., Budget-Conscious College Students"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="entry-content">Content</Label>
            <Textarea
              id="entry-content"
              placeholder="Detailed knowledge that will help Mo generate better content..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="entry-confidence">
              Confidence: {(confidence * 100).toFixed(0)}%
            </Label>
            <input
              id="entry-confidence"
              type="range"
              min="0.1"
              max="1.0"
              step="0.1"
              value={confidence}
              onChange={(e) => setConfidence(Number(e.target.value))}
              className="w-full"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : isEditing ? "Update" : "Add to Brain"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
