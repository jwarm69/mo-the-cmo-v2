"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Trash2, Clock, Eye, Pencil, Repeat2 } from "lucide-react";
import type { ContentItem } from "@/lib/types";
import { ContentEditDialog } from "./content-edit-dialog";
import { ContentPreviewModal } from "./content-preview-modal";
import { RepurposeDialog } from "./repurpose-dialog";

const PLATFORM_COLORS: Record<string, string> = {
  tiktok: "bg-pink-500/10 text-pink-700 border-pink-200",
  instagram: "bg-purple-500/10 text-purple-700 border-purple-200",
  twitter: "bg-blue-500/10 text-blue-700 border-blue-200",
  email: "bg-green-500/10 text-green-700 border-green-200",
  blog: "bg-orange-500/10 text-orange-700 border-orange-200",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  pending_approval: "Pending",
  approved: "Approved",
  scheduled: "Scheduled",
  published: "Published",
  archived: "Archived",
};

export function ContentCard({
  item,
  onApprove,
  onDelete,
  onRefresh,
}: {
  item: ContentItem;
  onApprove?: (id: string) => void;
  onDelete?: (id: string) => void;
  onRefresh?: () => void;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [repurposeOpen, setRepurposeOpen] = useState(false);

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Badge
                variant="outline"
                className={PLATFORM_COLORS[item.platform] || ""}
              >
                {item.platform}
              </Badge>
              <Badge variant="secondary">{item.pillar}</Badge>
            </div>
            <Badge variant={item.status === "draft" ? "outline" : "default"}>
              {STATUS_LABELS[item.status] || item.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">
              Topic
            </p>
            <p className="text-sm">{item.topic}</p>
          </div>
          {item.hook && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Hook
              </p>
              <p className="text-sm font-medium">{item.hook}</p>
            </div>
          )}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">
              Body
            </p>
            <p className="text-sm line-clamp-3">{item.body}</p>
          </div>
          {item.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {item.hashtags.slice(0, 5).map((tag, i) => (
                <span key={i} className="text-xs text-muted-foreground">
                  {tag}
                </span>
              ))}
            </div>
          )}
          {item.scheduledDate && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {item.scheduledDate} at {item.scheduledTime}
            </div>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            {item.status === "draft" && onApprove && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onApprove(item.id)}
              >
                <Check className="mr-1 h-3 w-3" />
                Approve
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="mr-1 h-3 w-3" />
              Edit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setPreviewOpen(true)}
            >
              <Eye className="mr-1 h-3 w-3" />
              Preview
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setRepurposeOpen(true)}
            >
              <Repeat2 className="mr-1 h-3 w-3" />
              Repurpose
            </Button>
            {onDelete && (
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive ml-auto"
                onClick={() => onDelete(item.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <ContentEditDialog
        item={item}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={onRefresh}
      />
      <ContentPreviewModal
        item={item}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
      <RepurposeDialog
        item={item}
        open={repurposeOpen}
        onOpenChange={setRepurposeOpen}
        onRepurposed={onRefresh}
      />
    </>
  );
}
