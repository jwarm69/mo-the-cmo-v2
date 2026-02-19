"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Lightbulb,
  Trash2,
  Sparkles,
} from "lucide-react";
import { ContentCard } from "@/components/content/content-card";
import { ContentGenerateDialog, type ContentPillar } from "@/components/content/content-generate-dialog";
import { ContentCalendar } from "@/components/content/content-calendar";
import type { ContentItem, Platform, ContentStatus } from "@/lib/types";

interface Idea {
  id: string;
  text: string;
  platform: string | null;
  pillar: string | null;
  source: string;
  status: string;
  createdAt: string;
}

export default function ContentPage() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [pillars, setPillars] = useState<ContentPillar[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [ideasLoading, setIdeasLoading] = useState(false);

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

  const fetchIdeas = useCallback(async () => {
    setIdeasLoading(true);
    try {
      const res = await fetch("/api/ideas?status=captured");
      if (res.ok) {
        setIdeas(await res.json());
      }
    } finally {
      setIdeasLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    fetchIdeas();
  }, [fetchIdeas]);

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

  const handleBulkGenerate = async () => {
    setBulkLoading(true);
    try {
      const res = await fetch("/api/content/bulk", { method: "POST" });
      if (res.ok) {
        fetchItems();
      }
    } finally {
      setBulkLoading(false);
    }
  };

  const handleDismissIdea = async (id: string) => {
    await fetch("/api/ideas", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "dismissed" }),
    });
    fetchIdeas();
  };

  const handleUseIdea = async (idea: Idea) => {
    // Mark as used and navigate to content generation
    await fetch("/api/ideas", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: idea.id, status: "used" }),
    });
    fetchIdeas();
  };

  const pendingItems = items.filter(
    (i) => i.status === "draft" || i.status === "pending_approval"
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">Content</h2>
          <p className="text-sm md:text-base text-muted-foreground">
            Manage your content library, calendar, ideas, and approvals.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="md:size-default"
            onClick={handleBulkGenerate}
            disabled={bulkLoading}
          >
            {bulkLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" />
                Generate Week
              </>
            )}
          </Button>
          <ContentGenerateDialog onGenerated={fetchItems} pillars={pillars} />
        </div>
      </div>

      <Tabs defaultValue="library">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="library" className="gap-1 md:gap-2 flex-1 sm:flex-none">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Library</span>
            <span className="sm:hidden">Lib</span>
            {items.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {items.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-1 md:gap-2 flex-1 sm:flex-none">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Calendar</span>
            <span className="sm:hidden">Cal</span>
          </TabsTrigger>
          <TabsTrigger value="ideas" className="gap-1 md:gap-2 flex-1 sm:flex-none">
            <Lightbulb className="h-4 w-4" />
            <span className="hidden sm:inline">Ideas</span>
            <span className="sm:hidden">Ideas</span>
            {ideas.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {ideas.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approvals" className="gap-1 md:gap-2 flex-1 sm:flex-none">
            <CheckSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Approvals</span>
            <span className="sm:hidden">Appr</span>
            {pendingItems.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {pendingItems.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="library" className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="w-[130px] sm:w-[140px]">
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
              <SelectTrigger className="w-[130px] sm:w-[140px]">
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
                  onRefresh={fetchItems}
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
                  Generate a week of content to populate the calendar.
                </p>
                <Button
                  variant="outline"
                  onClick={handleBulkGenerate}
                  disabled={bulkLoading}
                >
                  {bulkLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Zap className="mr-2 h-4 w-4" />
                      Generate Week
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <ContentCalendar items={items} />
          )}
        </TabsContent>

        <TabsContent value="ideas" className="space-y-4">
          {ideasLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : ideas.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Lightbulb className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">No ideas yet</h3>
                <p className="text-sm text-muted-foreground">
                  Capture ideas from the dashboard or ask Mo for suggestions in the chat.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {ideas.map((idea) => (
                <Card key={idea.id}>
                  <CardContent className="flex items-center gap-4 py-3">
                    <Lightbulb className="h-4 w-4 text-yellow-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{idea.text}</p>
                      <div className="flex gap-2 mt-1">
                        {idea.platform && (
                          <Badge variant="outline" className="text-xs">
                            {idea.platform}
                          </Badge>
                        )}
                        {idea.pillar && (
                          <Badge variant="secondary" className="text-xs">
                            {idea.pillar}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {new Date(idea.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <ContentGenerateDialog
                        onGenerated={() => {
                          handleUseIdea(idea);
                          fetchItems();
                        }}
                        pillars={pillars}
                        defaultTopic={idea.text}
                        defaultPlatform={idea.platform as Platform | undefined}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => handleDismissIdea(idea.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
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
                  onRefresh={fetchItems}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
