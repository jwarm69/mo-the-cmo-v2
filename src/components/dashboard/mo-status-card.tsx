"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, MessageSquare, Megaphone, FileText, TrendingUp } from "lucide-react";

const QUICK_ACTIONS = [
  { label: "Chat with Mo", href: "/chat", icon: MessageSquare },
  { label: "Create Campaign", href: "/campaigns", icon: Megaphone },
  { label: "Generate Content", href: "/content", icon: FileText },
  { label: "View Analytics", href: "/analytics", icon: TrendingUp },
];

export function MoStatusCard({ learningsCount }: { learningsCount: number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Brain className="h-5 w-5" />
          Mo&apos;s Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
            Online
          </Badge>
          <span className="text-sm text-muted-foreground">
            {learningsCount > 0
              ? `${learningsCount} learning${learningsCount !== 1 ? "s" : ""} acquired`
              : "Ready to learn about your brand"}
          </span>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {QUICK_ACTIONS.map((action) => (
            <Link key={action.href} href={action.href}>
              <Button variant="outline" className="w-full justify-start gap-2" size="sm">
                <action.icon className="h-4 w-4" />
                {action.label}
              </Button>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function MoStatusCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-5 w-24 animate-pulse rounded bg-muted" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-5 w-14 animate-pulse rounded bg-muted" />
          <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        </div>
        <div className="grid grid-cols-1 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-9 animate-pulse rounded border bg-muted" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
