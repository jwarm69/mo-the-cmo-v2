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
import { MoreHorizontal, Trash2, Calendar } from "lucide-react";

interface Goal {
  id: string;
  title: string;
  description: string | null;
  timeframe: string;
  status: string;
  targetMetric: string | null;
  targetValue: number | null;
  currentValue: number | null;
  startDate: string | null;
  endDate: string | null;
  productName?: string | null;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  not_started: "bg-gray-500/10 text-gray-700 border-gray-200",
  in_progress: "bg-blue-500/10 text-blue-700 border-blue-200",
  on_track: "bg-green-500/10 text-green-700 border-green-200",
  at_risk: "bg-orange-500/10 text-orange-700 border-orange-200",
  completed: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  missed: "bg-red-500/10 text-red-700 border-red-200",
};

const TIMEFRAME_COLORS: Record<string, string> = {
  weekly: "bg-purple-500/10 text-purple-700 border-purple-200",
  monthly: "bg-blue-500/10 text-blue-700 border-blue-200",
  quarterly: "bg-indigo-500/10 text-indigo-700 border-indigo-200",
  annual: "bg-violet-500/10 text-violet-700 border-violet-200",
};

function formatDate(d: string | null): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function GoalCard({
  goal,
  onStatusChange,
  onDelete,
}: {
  goal: Goal;
  onStatusChange?: (id: string, status: string) => void;
  onDelete?: (id: string) => void;
}) {
  const progress =
    goal.targetValue && goal.targetValue > 0
      ? Math.min(100, Math.round(((goal.currentValue || 0) / goal.targetValue) * 100))
      : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold truncate pr-2">{goal.title}</h3>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="outline" className={TIMEFRAME_COLORS[goal.timeframe] || ""}>
              {goal.timeframe}
            </Badge>
            <Badge variant="outline" className={STATUS_COLORS[goal.status] || ""}>
              {goal.status.replace("_", " ")}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {goal.status === "not_started" && (
                  <DropdownMenuItem onClick={() => onStatusChange?.(goal.id, "in_progress")}>
                    Start Working
                  </DropdownMenuItem>
                )}
                {goal.status === "in_progress" && (
                  <>
                    <DropdownMenuItem onClick={() => onStatusChange?.(goal.id, "on_track")}>
                      Mark On Track
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onStatusChange?.(goal.id, "at_risk")}>
                      Mark At Risk
                    </DropdownMenuItem>
                  </>
                )}
                {(goal.status === "in_progress" || goal.status === "on_track") && (
                  <DropdownMenuItem onClick={() => onStatusChange?.(goal.id, "completed")}>
                    Mark Completed
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => onDelete?.(goal.id)}
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
        {goal.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{goal.description}</p>
        )}
        {goal.productName && (
          <Badge variant="outline" className="text-xs bg-primary/5">
            {goal.productName}
          </Badge>
        )}
        {progress !== null && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {goal.currentValue || 0} / {goal.targetValue} {goal.targetMetric}
              </span>
              <span className="font-medium">{progress}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
        {(goal.startDate || goal.endDate) && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {formatDate(goal.startDate)}
            {goal.endDate && ` – ${formatDate(goal.endDate)}`}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
