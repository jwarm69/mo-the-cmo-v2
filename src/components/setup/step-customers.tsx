"use client";

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
import { Plus, X } from "lucide-react";
import type { BrandProfileInput } from "@/lib/brand/defaults";

interface StepProps {
  data: BrandProfileInput;
  onChange: (updates: Partial<BrandProfileInput>) => void;
}

export function StepCustomers({ data, onChange }: StepProps) {
  function updatePainPoint(index: number, value: string) {
    const updated = [...data.targetAudience.painPoints];
    updated[index] = value;
    onChange({
      targetAudience: { ...data.targetAudience, painPoints: updated },
    });
  }

  function addPainPoint() {
    onChange({
      targetAudience: {
        ...data.targetAudience,
        painPoints: [...data.targetAudience.painPoints, ""],
      },
    });
  }

  function removePainPoint(index: number) {
    const updated = data.targetAudience.painPoints.filter((_, i) => i !== index);
    onChange({
      targetAudience: { ...data.targetAudience, painPoints: updated },
    });
  }

  function updateGoal(index: number, value: string) {
    const updated = [...data.targetAudience.goals];
    updated[index] = value;
    onChange({
      targetAudience: { ...data.targetAudience, goals: updated },
    });
  }

  function addGoal() {
    onChange({
      targetAudience: {
        ...data.targetAudience,
        goals: [...data.targetAudience.goals, ""],
      },
    });
  }

  function removeGoal(index: number) {
    const updated = data.targetAudience.goals.filter((_, i) => i !== index);
    onChange({
      targetAudience: { ...data.targetAudience, goals: updated },
    });
  }

  function updateCompetitor(index: number, value: string) {
    const updated = [...data.competitors];
    updated[index] = value;
    onChange({ competitors: updated });
  }

  function addCompetitor() {
    onChange({ competitors: [...data.competitors, ""] });
  }

  function removeCompetitor(index: number) {
    const updated = data.competitors.filter((_, i) => i !== index);
    onChange({ competitors: updated });
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Your Customers</h3>
        <p className="text-sm text-muted-foreground">
          Help Mo understand who you&apos;re talking to.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Demographics</CardTitle>
          <CardDescription>
            Who are your customers? Age, location, industry, role, etc.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Small business owners, ages 25-45, primarily in the US..."
            value={data.targetAudience.demographics}
            onChange={(e) =>
              onChange({
                targetAudience: {
                  ...data.targetAudience,
                  demographics: e.target.value,
                },
              })
            }
            rows={3}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pain Points</CardTitle>
          <CardDescription>
            What keeps your customers up at night?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.targetAudience.painPoints.map((point, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                placeholder={`Pain point ${i + 1}`}
                value={point}
                onChange={(e) => updatePainPoint(i, e.target.value)}
              />
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => removePainPoint(i)}
                disabled={data.targetAudience.painPoints.length <= 1}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addPainPoint}>
            <Plus className="mr-1 h-4 w-4" />
            Add pain point
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Customer Goals</CardTitle>
          <CardDescription>
            What are your customers trying to achieve?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.targetAudience.goals.map((goal, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                placeholder={`Goal ${i + 1}`}
                value={goal}
                onChange={(e) => updateGoal(i, e.target.value)}
              />
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => removeGoal(i)}
                disabled={data.targetAudience.goals.length <= 1}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addGoal}>
            <Plus className="mr-1 h-4 w-4" />
            Add goal
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Competitors</CardTitle>
          <CardDescription>
            Who else is competing for your customers&apos; attention?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.competitors.map((comp, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                placeholder={`Competitor ${i + 1}`}
                value={comp}
                onChange={(e) => updateCompetitor(i, e.target.value)}
              />
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => removeCompetitor(i)}
                disabled={data.competitors.length <= 1}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addCompetitor}>
            <Plus className="mr-1 h-4 w-4" />
            Add competitor
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
