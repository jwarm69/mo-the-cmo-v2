"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface Template {
  id: string;
  name: string;
  platform: string | null;
  pillar: string | null;
  usageCount: number;
}

interface TemplatePickerProps {
  value?: string;
  onSelect: (templateId: string | undefined) => void;
  platform?: string;
}

export function TemplatePicker({
  value,
  onSelect,
  platform,
}: TemplatePickerProps) {
  const [templates, setTemplates] = useState<Template[]>([]);

  useEffect(() => {
    fetch("/api/templates")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Template[]) => {
        if (platform) {
          setTemplates(
            data.filter((t) => !t.platform || t.platform === platform)
          );
        } else {
          setTemplates(data);
        }
      })
      .catch(() => {});
  }, [platform]);

  if (templates.length === 0) return null;

  return (
    <div className="space-y-2">
      <Label>Template (optional)</Label>
      <Select
        value={value || "none"}
        onValueChange={(v) => onSelect(v === "none" ? undefined : v)}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="No template" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">None</SelectItem>
          {templates.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.name}
              {t.platform ? ` (${t.platform})` : ""}
              {t.usageCount > 0 ? ` \u00b7 ${t.usageCount}x` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
