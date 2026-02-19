"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Trash2, Calendar, DollarSign, Sparkles } from "lucide-react";
import { useState } from "react";
import { CampaignGenerateDialog } from "./campaign-generate-dialog";

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  objective: string | null;
  status: string;
  platforms: string[] | null;
  startDate: string | null;
  endDate: string | null;
  budget: number | null;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-500/10 text-gray-700 border-gray-200",
  active: "bg-green-500/10 text-green-700 border-green-200",
  paused: "bg-yellow-500/10 text-yellow-700 border-yellow-200",
  completed: "bg-blue-500/10 text-blue-700 border-blue-200",
  archived: "bg-gray-400/10 text-gray-500 border-gray-200",
};

const PLATFORM_COLORS: Record<string, string> = {
  tiktok: "bg-pink-500/10 text-pink-700 border-pink-200",
  instagram: "bg-purple-500/10 text-purple-700 border-purple-200",
  twitter: "bg-blue-500/10 text-blue-700 border-blue-200",
  facebook: "bg-indigo-500/10 text-indigo-700 border-indigo-200",
  linkedin: "bg-sky-500/10 text-sky-700 border-sky-200",
  email: "bg-green-500/10 text-green-700 border-green-200",
  blog: "bg-orange-500/10 text-orange-700 border-orange-200",
};

function formatDate(d: string | null): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function CampaignCard({
  campaign,
  onStatusChange,
  onDelete,
  onContentGenerated,
}: {
  campaign: Campaign;
  onStatusChange?: (id: string, status: string) => void;
  onDelete?: (id: string) => void;
  onContentGenerated?: () => void;
}) {
  const [generateOpen, setGenerateOpen] = useState(false);

  return (
    <>
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold truncate pr-2">{campaign.name}</h3>
          <div className="flex items-center gap-2 shrink-0">
            <Badge
              variant="outline"
              className={STATUS_COLORS[campaign.status] || ""}
            >
              {campaign.status}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {campaign.status === "draft" && (
                  <DropdownMenuItem onClick={() => onStatusChange?.(campaign.id, "active")}>
                    Set Active
                  </DropdownMenuItem>
                )}
                {campaign.status === "active" && (
                  <>
                    <DropdownMenuItem onClick={() => onStatusChange?.(campaign.id, "paused")}>
                      Pause
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onStatusChange?.(campaign.id, "completed")}>
                      Mark Completed
                    </DropdownMenuItem>
                  </>
                )}
                {campaign.status === "paused" && (
                  <DropdownMenuItem onClick={() => onStatusChange?.(campaign.id, "active")}>
                    Resume
                  </DropdownMenuItem>
                )}
                {(campaign.status === "completed" || campaign.status === "paused") && (
                  <DropdownMenuItem onClick={() => onStatusChange?.(campaign.id, "archived")}>
                    Archive
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => onDelete?.(campaign.id)}
                >
                  <Trash2 className="mr-2 h-3 w-3" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {campaign.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {campaign.description}
          </p>
        )}
        {campaign.objective && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">
              Objective
            </p>
            <p className="text-sm">{campaign.objective}</p>
          </div>
        )}
        {campaign.platforms && campaign.platforms.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {campaign.platforms.map((p) => (
              <Badge
                key={p}
                variant="outline"
                className={`text-xs ${PLATFORM_COLORS[p] || ""}`}
              >
                {p}
              </Badge>
            ))}
          </div>
        )}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {(campaign.startDate || campaign.endDate) && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(campaign.startDate)}
              {campaign.endDate && ` – ${formatDate(campaign.endDate)}`}
            </span>
          )}
          {campaign.budget != null && campaign.budget > 0 && (
            <span className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              {campaign.budget.toLocaleString("en-US", { style: "currency", currency: "USD" })}
            </span>
          )}
        </div>
        {(campaign.status === "draft" || campaign.status === "active") && (
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-2"
            onClick={() => setGenerateOpen(true)}
          >
            <Sparkles className="mr-2 h-3 w-3" />
            Generate Content
          </Button>
        )}
      </CardContent>
    </Card>
    <CampaignGenerateDialog
      campaign={campaign}
      open={generateOpen}
      onOpenChange={setGenerateOpen}
      onGenerated={onContentGenerated}
    />
    </>
  );
}
