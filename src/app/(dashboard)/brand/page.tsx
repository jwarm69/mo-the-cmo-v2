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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Palette, Target, BookOpen, Hash, Save, Database } from "lucide-react";
import { useEffect, useState } from "react";
import {
  DEFAULT_BRAND_PROFILE,
  normalizeBrandProfile,
  type BrandProfileInput,
} from "@/lib/brand/defaults";
import {
  buildClientApiHeaders,
  CLIENT_DEFAULT_ORG_NAME,
  CLIENT_DEFAULT_ORG_SLUG,
} from "@/lib/client-config";
import { KnowledgeList } from "@/components/content/knowledge-list";

export default function BrandPage() {
  const [brand, setBrand] = useState<BrandProfileInput>({
    ...DEFAULT_BRAND_PROFILE,
    name: CLIENT_DEFAULT_ORG_NAME,
  });
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadBrandProfile = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(
          `/api/brand?orgSlug=${encodeURIComponent(CLIENT_DEFAULT_ORG_SLUG)}`,
          { headers: buildClientApiHeaders() }
        );
        const data = (await response.json()) as {
          error?: string;
          profile?: Partial<BrandProfileInput> | null;
        };

        if (!response.ok) {
          setError(data.error ?? "Failed to load brand profile");
          return;
        }

        setBrand(
          normalizeBrandProfile({
            ...data.profile,
            name: data.profile?.name ?? CLIENT_DEFAULT_ORG_NAME,
          })
        );
      } catch (loadError) {
        const message =
          loadError instanceof Error
            ? loadError.message
            : "Failed to load brand profile";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    void loadBrandProfile();
  }, []);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);

      const response = await fetch("/api/brand", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...buildClientApiHeaders(),
        },
        body: JSON.stringify({
          orgSlug: CLIENT_DEFAULT_ORG_SLUG,
          ...brand,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        profile?: Partial<BrandProfileInput> | null;
      };

      if (!response.ok) {
        setError(data.error ?? "Failed to save brand profile");
        return;
      }

      setBrand(normalizeBrandProfile(data.profile));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : "Failed to save brand profile";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">Brand Profile</h2>
          <p className="text-sm md:text-base text-muted-foreground">
            Define your brand voice, messaging, and content strategy. Mo uses
            this for all content generation.
          </p>
          {isLoading && (
            <p className="mt-2 text-sm text-muted-foreground">
              Loading brand profile...
            </p>
          )}
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        </div>
        <Button onClick={handleSave} disabled={isSaving || isLoading} className="w-full sm:w-auto shrink-0">
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
        </Button>
      </div>

      <Tabs defaultValue="voice">
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <TabsList className="w-max md:w-auto">
            <TabsTrigger value="voice" className="gap-1 md:gap-2">
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">Voice & Tone</span>
              <span className="sm:hidden">Voice</span>
            </TabsTrigger>
            <TabsTrigger value="pillars" className="gap-1 md:gap-2">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Content Pillars</span>
              <span className="sm:hidden">Pillars</span>
            </TabsTrigger>
            <TabsTrigger value="audience" className="gap-1 md:gap-2">
              <Target className="h-4 w-4" />
              <span className="hidden sm:inline">Target Audience</span>
              <span className="sm:hidden">Audience</span>
            </TabsTrigger>
            <TabsTrigger value="details" className="gap-1 md:gap-2">
              <Hash className="h-4 w-4" />
              Details
            </TabsTrigger>
            <TabsTrigger value="knowledge" className="gap-1 md:gap-2">
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">Knowledge Base</span>
              <span className="sm:hidden">Knowledge</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Voice & Tone */}
        <TabsContent value="voice" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Brand Voice</CardTitle>
              <CardDescription>
                How Mo should sound when creating content.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="voice">Voice Description</Label>
                <Textarea
                  id="voice"
                  value={brand.voice}
                  onChange={(e) =>
                    setBrand({ ...brand, voice: e.target.value })
                  }
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tone">Tone</Label>
                <Input
                  id="tone"
                  value={brand.tone}
                  onChange={(e) =>
                    setBrand({ ...brand, tone: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guidelines">Brand Guidelines</Label>
                <Textarea
                  id="guidelines"
                  value={brand.brandGuidelines}
                  onChange={(e) =>
                    setBrand({ ...brand, brandGuidelines: e.target.value })
                  }
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Messaging Pillars</CardTitle>
              <CardDescription>
                Core messages that underpin all marketing.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {brand.messagingPillars.map((pillar, i) => (
                <div key={i} className="space-y-1">
                  <Label>Pillar {i + 1}</Label>
                  <Textarea
                    value={pillar}
                    onChange={(e) => {
                      const updated = [...brand.messagingPillars];
                      updated[i] = e.target.value;
                      setBrand({ ...brand, messagingPillars: updated });
                    }}
                    rows={2}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Content Pillars */}
        <TabsContent value="pillars" className="space-y-4">
          {brand.contentPillars.map((pillar, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{pillar.name}</CardTitle>
                  <Badge variant="secondary">{pillar.ratio}% of content</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label>Name</Label>
                  <Input
                    value={pillar.name}
                    onChange={(e) => {
                      const updated = [...brand.contentPillars];
                      updated[i] = { ...updated[i], name: e.target.value };
                      setBrand({ ...brand, contentPillars: updated });
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Ratio (%)</Label>
                  <Input
                    type="number"
                    value={pillar.ratio}
                    onChange={(e) => {
                      const updated = [...brand.contentPillars];
                      updated[i] = {
                        ...updated[i],
                        ratio: parseInt(e.target.value) || 0,
                      };
                      setBrand({ ...brand, contentPillars: updated });
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Description</Label>
                  <Textarea
                    value={pillar.description}
                    onChange={(e) => {
                      const updated = [...brand.contentPillars];
                      updated[i] = {
                        ...updated[i],
                        description: e.target.value,
                      };
                      setBrand({ ...brand, contentPillars: updated });
                    }}
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Target Audience */}
        <TabsContent value="audience" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Demographics</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={brand.targetAudience.demographics}
                onChange={(e) =>
                  setBrand({
                    ...brand,
                    targetAudience: {
                      ...brand.targetAudience,
                      demographics: e.target.value,
                    },
                  })
                }
                rows={2}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Psychographics</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={brand.targetAudience.psychographics}
                onChange={(e) =>
                  setBrand({
                    ...brand,
                    targetAudience: {
                      ...brand.targetAudience,
                      psychographics: e.target.value,
                    },
                  })
                }
                rows={2}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pain Points</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {brand.targetAudience.painPoints.map((point, i) => (
                <Input
                  key={i}
                  value={point}
                  onChange={(e) => {
                    const updated = [...brand.targetAudience.painPoints];
                    updated[i] = e.target.value;
                    setBrand({
                      ...brand,
                      targetAudience: {
                        ...brand.targetAudience,
                        painPoints: updated,
                      },
                    });
                  }}
                />
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Customer Goals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {brand.targetAudience.goals.map((goal, i) => (
                <Input
                  key={i}
                  value={goal}
                  onChange={(e) => {
                    const updated = [...brand.targetAudience.goals];
                    updated[i] = e.target.value;
                    setBrand({
                      ...brand,
                      targetAudience: {
                        ...brand.targetAudience,
                        goals: updated,
                      },
                    });
                  }}
                />
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Details */}
        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Competitors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {brand.competitors.map((comp, i) => (
                  <Badge key={i} variant="outline">
                    {comp}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Hashtags</CardTitle>
              <CardDescription>
                Default hashtags for content generation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {brand.hashtags.map((tag, i) => (
                  <Badge key={i} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Knowledge Base */}
        <TabsContent value="knowledge" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Knowledge Base</CardTitle>
              <CardDescription>
                Marketing documents that Mo uses to generate brand-aware content
                via RAG.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <KnowledgeList />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
