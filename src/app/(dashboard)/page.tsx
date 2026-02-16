import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  TrendingUp,
  Calendar,
  Brain,
  MessageSquare,
  Megaphone,
} from "lucide-react";
import Link from "next/link";

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
  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          Welcome back
        </h2>
        <p className="text-muted-foreground">
          Here&apos;s what&apos;s happening with your marketing today.
        </p>
      </div>

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
