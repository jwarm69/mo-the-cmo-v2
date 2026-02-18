"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText,
  TrendingUp,
  Calendar,
  Brain,
  MessageSquare,
  Megaphone,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { buildClientApiHeaders, CLIENT_DEFAULT_ORG_SLUG, CLIENT_DEFAULT_ORG_NAME } from "@/lib/client-config";
import { DEFAULT_BRAND_PROFILE } from "@/lib/brand/defaults";

const stats = [
  {
    title: "Content Pieces",
    value: "0",
    description: "This month",
    icon: FileText,
    change: "Getting started",
  },
  {
    title: "Engagement Rate",
    value: "--",
    description: "Avg across platforms",
    icon: TrendingUp,
    change: "No data yet",
  },
  {
    title: "Scheduled",
    value: "0",
    description: "Upcoming posts",
    icon: Calendar,
    change: "Queue empty",
  },
  {
    title: "Learnings",
    value: "0",
    description: "Mo's insights",
    icon: Brain,
    change: "Learning...",
  },
];

const quickActions = [
  {
    title: "Chat with Mo",
    description: "Ask Mo to create content, plan campaigns, or analyze performance",
    href: "/chat",
    icon: MessageSquare,
  },
  {
    title: "Create Campaign",
    description: "Plan a new multi-channel marketing campaign",
    href: "/campaigns",
    icon: Megaphone,
  },
  {
    title: "Generate Content",
    description: "Create platform-specific content with Mo",
    href: "/content",
    icon: FileText,
  },
  {
    title: "View Analytics",
    description: "See how your content is performing",
    href: "/analytics",
    icon: TrendingUp,
  },
];

export default function DashboardPage() {
  const [needsSetup, setNeedsSetup] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkBrand() {
      try {
        const res = await fetch(
          `/api/brand?orgSlug=${encodeURIComponent(CLIENT_DEFAULT_ORG_SLUG)}`,
          { headers: buildClientApiHeaders() }
        );
        const data = await res.json();
        const profile = data.profile;
        if (!profile || profile.voice === DEFAULT_BRAND_PROFILE.voice) {
          setNeedsSetup(true);
        }
      } catch {
        setNeedsSetup(true);
      } finally {
        setIsLoading(false);
      }
    }
    checkBrand();
  }, []);

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          Welcome back to <span className="text-primary">{CLIENT_DEFAULT_ORG_NAME}</span>
        </h2>
        <p className="text-muted-foreground">
          Here&apos;s what&apos;s happening with {CLIENT_DEFAULT_ORG_NAME} marketing today.
        </p>
      </div>

      {/* Setup CTA */}
      {needsSetup && !isLoading && (
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardHeader className="flex flex-row items-center gap-4">
            <div className="rounded-lg bg-primary/10 p-3">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle>Set Up Mo for Your Brand</CardTitle>
              <CardDescription>
                Walk through a quick setup wizard to teach Mo about your brand, audience, and voice. Takes about 5 minutes.
              </CardDescription>
            </div>
            <Link href="/setup">
              <Button>Start Setup</Button>
            </Link>
          </CardHeader>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.change}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="mb-4 text-lg font-semibold">Quick Actions</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {quickActions.map((action) => (
            <Link key={action.href} href={action.href}>
              <Card className="transition-colors hover:bg-accent/50 cursor-pointer">
                <CardHeader className="flex flex-row items-center gap-4">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <action.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">
                      {action.title}
                    </CardTitle>
                    <CardDescription>{action.description}</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Mo Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Mo&apos;s Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Badge variant="outline">Online</Badge>
            <span className="text-sm text-muted-foreground">
              Mo is ready to help with your marketing. Start a chat or create a
              campaign to get going.
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
