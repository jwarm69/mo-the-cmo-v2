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
import { Palette, Target, BookOpen, Hash, Save } from "lucide-react";
import { useState } from "react";
import { BITE_CLUB_BRAND_SEED } from "@/lib/seed/bite-club";

export default function BrandPage() {
  const [brand, setBrand] = useState(BITE_CLUB_BRAND_SEED);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Brand Profile</h2>
          <p className="text-muted-foreground">
            Define your brand voice, messaging, and content strategy. Mo uses
            this for all content generation.
          </p>
        </div>
        <Button onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" />
          {saved ? "Saved!" : "Save Changes"}
        </Button>
      </div>

      <Tabs defaultValue="voice">
        <TabsList>
          <TabsTrigger value="voice" className="gap-2">
            <Palette className="h-4 w-4" />
            Voice & Tone
          </TabsTrigger>
          <TabsTrigger value="pillars" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Content Pillars
          </TabsTrigger>
          <TabsTrigger value="audience" className="gap-2">
            <Target className="h-4 w-4" />
            Target Audience
          </TabsTrigger>
          <TabsTrigger value="details" className="gap-2">
            <Hash className="h-4 w-4" />
            Details
          </TabsTrigger>
        </TabsList>

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
      </Tabs>
    </div>
  );
}
