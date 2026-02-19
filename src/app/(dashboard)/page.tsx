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
  Clock,
} from "lucide-react";
import Link from "next/link";
import { buildClientApiHeaders, CLIENT_DEFAULT_ORG_SLUG, CLIENT_DEFAULT_ORG_NAME } from "@/lib/client-config";
import { DEFAULT_BRAND_PROFILE } from "@/lib/brand/defaults";
import { IdeaCapture } from "@/components/dashboard/idea-capture";
import { SuggestionCards } from "@/components/dashboard/suggestion-cards";

interface DashboardStats {
  contentThisMonth: number;
  scheduled: number;
  pendingApproval: number;
  learnings: number;
  knowledgeDocs: number;
}

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
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [brandRes, statsRes] = await Promise.all([
          fetch(
            `/api/brand?orgSlug=${encodeURIComponent(CLIENT_DEFAULT_ORG_SLUG)}`,
            { headers: buildClientApiHeaders() }
          ),
          fetch("/api/dashboard/stats", {
            headers: buildClientApiHeaders(),
          }),
        ]);

        const brandData = await brandRes.json();
        const profile = brandData.profile;
        if (!profile || profile.voice === DEFAULT_BRAND_PROFILE.voice) {
          setNeedsSetup(true);
        }

        if (statsRes.ok) {
          setStats(await statsRes.json());
        }
      } catch {
        setNeedsSetup(true);
      } finally {
        setIsLoading(false);
      }
    }
    loadDashboard();
  }, []);

  const statCards = [
    {
      title: "Content Pieces",
      value: stats?.contentThisMonth ?? 0,
      description: "This month",
      icon: FileText,
      change: stats?.contentThisMonth
        ? `${stats.contentThisMonth} created`
        : "Getting started",
    },
    {
      title: "Pending Approval",
      value: stats?.pendingApproval ?? 0,
      description: "Drafts & pending",
      icon: Clock,
      change: stats?.pendingApproval
        ? `${stats.pendingApproval} to review`
        : "Queue clear",
    },
    {
      title: "Scheduled",
      value: stats?.scheduled ?? 0,
      description: "Upcoming posts",
      icon: Calendar,
      change: stats?.scheduled
        ? `${stats.scheduled} queued`
        : "Queue empty",
    },
    {
      title: "Learnings",
      value: stats?.learnings ?? 0,
      description: "Mo's insights",
      icon: Brain,
      change: stats?.learnings
        ? `${stats.learnings} stored`
        : "Learning...",
    },
  ];

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Welcome */}
      <div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
          Welcome back to <span className="text-primary">{CLIENT_DEFAULT_ORG_NAME}</span>
        </h2>
        <p className="text-sm md:text-base text-muted-foreground">
          Here&apos;s what&apos;s happening with {CLIENT_DEFAULT_ORG_NAME} marketing today.
        </p>
      </div>

      {/* Setup CTA */}
      {needsSetup && !isLoading && (
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
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
              <Button className="w-full sm:w-auto">Start Setup</Button>
            </Link>
          </CardHeader>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        {statCards.map((stat) => (
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

      {/* Idea Capture */}
      <IdeaCapture />

      {/* Mo's Suggestions */}
      <SuggestionCards />

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
              {stats?.knowledgeDocs
                ? `${stats.knowledgeDocs} knowledge docs indexed. `
                : ""}
              Mo is ready to help with your marketing.
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
