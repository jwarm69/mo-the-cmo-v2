"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Calendar,
  CheckSquare,
  Loader2,
  Zap,
} from "lucide-react";
import { ContentCard } from "@/components/content/content-card";
import { ContentGenerateDialog, type ContentPillar } from "@/components/content/content-generate-dialog";
import { ContentCalendar } from "@/components/content/content-calendar";
import type { ContentItem, ContentStatus } from "@/lib/types";

export default function ContentPage() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [pillars, setPillars] = useState<ContentPillar[]>([]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (platformFilter !== "all") params.set("platform", platformFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/content?${params}`);
      if (res.ok) {
        const data = await res.json();
        setItems(
          data.map((d: ContentItem & { createdAt: string }) => ({
            ...d,
            createdAt: new Date(d.createdAt),
          }))
        );
      }
    } finally {
      setLoading(false);
    }
  }, [platformFilter, statusFilter]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    fetch("/api/brand")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.profile?.contentPillars) {
          setPillars(data.profile.contentPillars);
        }
      })
      .catch(() => {});
  }, []);

  const handleApprove = async (id: string) => {
    await fetch("/api/content", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "approved" as ContentStatus }),
    });
    fetchItems();
  };

  const handleDelete = async (id: string) => {
    await fetch("/api/content", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchItems();
  };

  const pendingItems = items.filter(
    (i) => i.status === "draft" || i.status === "pending_approval"
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Content</h2>
          <p className="text-muted-foreground">
            Review generated content, approve drafts, and manage your queue.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/plan">
            <Button variant="outline">
              <Zap className="mr-2 h-4 w-4" />
              Open Plan
            </Button>
          </Link>
          <ContentGenerateDialog onGenerated={fetchItems} pillars={pillars} />
        </div>
      </div>

      <Tabs defaultValue="library">
        <TabsList>
          <TabsTrigger value="library" className="gap-2">
            <FileText className="h-4 w-4" />
            Library
            {items.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {items.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-2">
            <Calendar className="h-4 w-4" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="approvals" className="gap-2">
            <CheckSquare className="h-4 w-4" />
            Approvals
            {pendingItems.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {pendingItems.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="library" className="space-y-4">
          <div className="flex gap-2">
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                <SelectItem value="tiktok">TikTok</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="twitter">Twitter/X</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="blog">Blog</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="published">Published</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">No content yet</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  Ask Mo to generate content or use the buttons above.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <ContentCard
                  key={item.id}
                  item={item}
                  onApprove={handleApprove}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="calendar">
          {items.filter((i) => i.scheduledDate).length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">
                  Content Calendar
                </h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  Use the plan flow to generate a full week and fill this calendar.
                </p>
                <Link href="/plan">
                  <Button variant="outline">
                    <Zap className="mr-2 h-4 w-4" />
                    Open Plan
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <ContentCalendar items={items} />
          )}
        </TabsContent>

        <TabsContent value="approvals">
          {pendingItems.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckSquare className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">Approval Queue</h3>
                <p className="text-sm text-muted-foreground">
                  No items pending approval.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pendingItems.map((item) => (
                <ContentCard
                  key={item.id}
                  item={item}
                  onApprove={handleApprove}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
