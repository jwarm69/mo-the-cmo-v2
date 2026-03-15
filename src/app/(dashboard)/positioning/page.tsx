"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Target, MessageSquare } from "lucide-react";

interface CustomerProfile {
  id: string;
  name: string;
  isPrimary: boolean;
  status: string;
  demographics: Record<string, string> | null;
  psychographics: Record<string, unknown> | null;
  painPoints: string[] | null;
  goals: string[] | null;
  objections: string[] | null;
  buyingTriggers: string[] | null;
  preferredChannels: string[] | null;
  messagingAngle: string | null;
  evidence: string | null;
}

interface PositioningFramework {
  id: string;
  type: string;
  title: string;
  content: Record<string, unknown>;
  version: number;
  isActive: boolean;
  productId: string | null;
  icpId: string | null;
}

const TYPE_LABELS: Record<string, string> = {
  value_prop: "Value Proposition",
  positioning_statement: "Positioning Statement",
  messaging_framework: "Messaging Framework",
  competitive_positioning: "Competitive Positioning",
};

export default function PositioningPage() {
  const [icps, setIcps] = useState<CustomerProfile[]>([]);
  const [frameworks, setFrameworks] = useState<PositioningFramework[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [icpRes, posRes] = await Promise.all([
        fetch("/api/icps"),
        fetch("/api/positioning"),
      ]);
      if (icpRes.ok) setIcps(await icpRes.json());
      if (posRes.ok) setFrameworks(await posRes.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">ICP & Positioning</h2>
          <p className="text-sm md:text-base text-muted-foreground">
            Define your ideal customers and how you position against alternatives.
          </p>
        </div>
        <Link href="/chat">
          <Button>
            <MessageSquare className="mr-2 h-4 w-4" />
            Ask Mo About ICPs
          </Button>
        </Link>
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-sm text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="icps">
          <TabsList>
            <TabsTrigger value="icps">ICPs ({icps.length})</TabsTrigger>
            <TabsTrigger value="positioning">Positioning ({frameworks.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="icps" className="space-y-4">
            {icps.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Users className="mb-4 h-12 w-12 text-muted-foreground" />
                  <h3 className="mb-2 text-lg font-semibold">No ICPs defined yet</h3>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Tell Mo about your ideal customers in the chat to create ICPs.
                  </p>
                  <Link href="/chat">
                    <Button>Define ICPs with Mo</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {icps.map((icp) => (
                  <Card key={icp.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base">{icp.name}</CardTitle>
                        <div className="flex gap-1">
                          {icp.isPrimary && <Badge>Primary</Badge>}
                          <Badge variant={icp.status === "active" ? "default" : "secondary"}>
                            {icp.status}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      {icp.painPoints && icp.painPoints.length > 0 && (
                        <div>
                          <p className="font-medium text-xs text-muted-foreground mb-1">Pain Points</p>
                          <ul className="list-disc list-inside space-y-0.5">
                            {(icp.painPoints as string[]).slice(0, 4).map((p, i) => (
                              <li key={i} className="text-xs">{p}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {icp.goals && icp.goals.length > 0 && (
                        <div>
                          <p className="font-medium text-xs text-muted-foreground mb-1">Goals</p>
                          <ul className="list-disc list-inside space-y-0.5">
                            {(icp.goals as string[]).slice(0, 4).map((g, i) => (
                              <li key={i} className="text-xs">{g}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {icp.preferredChannels && icp.preferredChannels.length > 0 && (
                        <div>
                          <p className="font-medium text-xs text-muted-foreground mb-1">Preferred Channels</p>
                          <div className="flex flex-wrap gap-1">
                            {(icp.preferredChannels as string[]).map((ch, i) => (
                              <Badge key={i} variant="outline" className="text-xs">{ch}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {icp.messagingAngle && (
                        <div>
                          <p className="font-medium text-xs text-muted-foreground mb-1">Messaging Angle</p>
                          <p className="text-xs">{icp.messagingAngle}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="positioning" className="space-y-4">
            {frameworks.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Target className="mb-4 h-12 w-12 text-muted-foreground" />
                  <h3 className="mb-2 text-lg font-semibold">No positioning frameworks yet</h3>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Ask Mo to create value propositions or positioning statements.
                  </p>
                  <Link href="/chat">
                    <Button>Create Positioning with Mo</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {frameworks.map((fw) => (
                  <Card key={fw.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base">{fw.title}</CardTitle>
                          <CardDescription className="text-xs">
                            {TYPE_LABELS[fw.type] ?? fw.type} (v{fw.version})
                          </CardDescription>
                        </div>
                        <Badge variant={fw.isActive ? "default" : "secondary"}>
                          {fw.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1 text-xs">
                        {Object.entries(fw.content as Record<string, unknown>)
                          .slice(0, 5)
                          .map(([key, value]) => (
                            <div key={key}>
                              <span className="font-medium">{key}: </span>
                              <span className="text-muted-foreground">
                                {typeof value === "string"
                                  ? value.slice(0, 120)
                                  : JSON.stringify(value).slice(0, 120)}
                              </span>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
