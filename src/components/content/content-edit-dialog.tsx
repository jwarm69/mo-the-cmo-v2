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
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import type { ContentItem } from "@/lib/types";

export function ContentEditDialog({
  item,
  open,
  onOpenChange,
  onSaved,
}: {
  item: ContentItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}) {
  const [hook, setHook] = useState(item.hook);
  const [body, setBody] = useState(item.body);
  const [cta, setCta] = useState(item.cta);
  const [hashtags, setHashtags] = useState(item.hashtags.join(", "));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          hook,
          body,
          cta,
          hashtags: hashtags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      });
      if (res.ok) {
        onOpenChange(false);
        onSaved?.();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Content</DialogTitle>
          <DialogDescription>
            Edit your {item.platform} content. Changes are tracked and help Mo
            learn your preferences.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-hook">Hook</Label>
            <Input
              id="edit-hook"
              value={hook}
              onChange={(e) => setHook(e.target.value)}
              placeholder="Attention-grabbing opener"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-body">Body</Label>
            <Textarea
              id="edit-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              placeholder="Main content"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-cta">Call to Action</Label>
            <Input
              id="edit-cta"
              value={cta}
              onChange={(e) => setCta(e.target.value)}
              placeholder="What should the audience do?"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-hashtags">Hashtags (comma-separated)</Label>
            <Input
              id="edit-hashtags"
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              placeholder="#tag1, #tag2, #tag3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !body.trim()}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
