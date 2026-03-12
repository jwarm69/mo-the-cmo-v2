"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target } from "lucide-react";
import { GoalCard } from "@/components/goals/goal-card";
import { GoalCreateDialog } from "@/components/goals/goal-create-dialog";

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

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  const fetchGoals = useCallback(async () => {
    try {
      const url = filter === "all" ? "/api/goals" : `/api/goals?timeframe=${filter}`;
      const res = await fetch(url);
      if (res.ok) {
        setGoals(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const handleStatusChange = async (id: string, status: string) => {
    const res = await fetch(`/api/goals`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) fetchGoals();
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/goals`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) fetchGoals();
  };

  const activeGoals = goals.filter((g) => !["completed", "missed"].includes(g.status));
  const completedGoals = goals.filter((g) => ["completed", "missed"].includes(g.status));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">Marketing Goals</h2>
          <p className="text-sm md:text-base text-muted-foreground">
            Set measurable objectives. Mo aligns every recommendation with these.
          </p>
        </div>
        <GoalCreateDialog onCreated={fetchGoals} />
      </div>

      <div className="flex gap-2">
        {["all", "weekly", "monthly", "quarterly", "annual"].map((t) => (
          <Badge
            key={t}
            variant={filter === t ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setFilter(t)}
          >
            {t === "all" ? "All" : t.charAt(0).toUpperCase() + t.slice(1)}
          </Badge>
        ))}
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-sm text-muted-foreground">Loading goals...</p>
          </CardContent>
        </Card>
      ) : goals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Target className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">No goals yet</h3>
            <p className="mb-4 text-sm text-muted-foreground text-center max-w-sm">
              Set your marketing goals so Mo can build strategies that drive real results.
            </p>
            <GoalCreateDialog onCreated={fetchGoals} />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {activeGoals.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activeGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
          {completedGoals.length > 0 && (
            <>
              <h3 className="text-sm font-medium text-muted-foreground">Completed</h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {completedGoals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
