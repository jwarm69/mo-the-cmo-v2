"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Sun, Moon, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";

const themes = [
  {
    id: "light",
    label: "Light",
    icon: Sun,
    bg: "bg-white",
    fg: "text-neutral-900",
    border: "border-neutral-200",
    preview: "bg-neutral-100",
  },
  {
    id: "dark",
    label: "Dark",
    icon: Moon,
    bg: "bg-neutral-900",
    fg: "text-neutral-100",
    border: "border-neutral-700",
    preview: "bg-neutral-800",
  },
  {
    id: "homebrew",
    label: "Homebrew",
    icon: Terminal,
    bg: "bg-black",
    fg: "text-green-400",
    border: "border-green-900",
    preview: "bg-green-950",
  },
] as const;

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl md:text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-sm md:text-base text-muted-foreground">
          Manage integrations, billing, and account preferences.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Choose a visual theme for the dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            {themes.map((t) => {
              const Icon = t.icon;
              const isActive = mounted && theme === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={cn(
                    "group relative flex flex-col items-center gap-3 rounded-lg border-2 p-6 transition-all hover:scale-[1.02]",
                    isActive
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border hover:border-muted-foreground/30"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-16 w-full items-center justify-center rounded-md",
                      t.bg,
                      t.border,
                      "border"
                    )}
                  >
                    <Icon className={cn("h-6 w-6", t.fg)} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{t.label}</span>
                    {isActive && (
                      <span className="h-2 w-2 rounded-full bg-primary" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Integrations</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Settings className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Integration settings coming in Sprint 4 (Buffer) and Sprint 7 (Resend).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
