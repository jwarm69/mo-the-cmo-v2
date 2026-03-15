"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, MessageSquare } from "lucide-react";

interface SalesAsset {
  id: string;
  contentType: string;
  title: string | null;
  body: string;
  status: string;
  campaignId: string | null;
  createdAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  battle_card: "Battle Card",
  outbound_sequence: "Outbound Sequence",
  objection_handler: "Objection Handler",
  pitch_deck_outline: "Pitch Deck Outline",
  one_pager: "One-Pager",
  case_study: "Case Study",
};

const TYPE_ICONS: Record<string, string> = {
  battle_card: "⚔️",
  outbound_sequence: "📧",
  objection_handler: "🛡️",
  pitch_deck_outline: "📊",
  one_pager: "📄",
  case_study: "📋",
};

export default function SalesPage() {
  const [assets, setAssets] = useState<SalesAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  const fetchAssets = useCallback(async () => {
    try {
      const res = await fetch("/api/sales-assets");
      if (res.ok) {
        setAssets(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const types = [...new Set(assets.map((a) => a.contentType))];
  const filtered = filter === "all"
    ? assets
    : assets.filter((a) => a.contentType === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">Sales Enablement</h2>
          <p className="text-sm md:text-base text-muted-foreground">
            Battle cards, outbound sequences, objection handlers, and more.
          </p>
        </div>
        <Link href="/chat">
          <Button>
            <MessageSquare className="mr-2 h-4 w-4" />
            Generate Sales Assets
          </Button>
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          All ({assets.length})
        </Button>
        {types.map((type) => (
          <Button
            key={type}
            variant={filter === type ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(type)}
          >
            {TYPE_ICONS[type] ?? "📌"} {TYPE_LABELS[type] ?? type} ({assets.filter((a) => a.contentType === type).length})
          </Button>
        ))}
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-sm text-muted-foreground">Loading sales assets...</p>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">No sales assets yet</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Ask Mo to create battle cards, outbound sequences, or objection handlers.
            </p>
            <Link href="/chat">
              <Button>Create Sales Assets with Mo</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((asset) => (
            <Card key={asset.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{TYPE_ICONS[asset.contentType] ?? "📌"}</span>
                    <div>
                      <CardTitle className="text-base">{asset.title ?? "Untitled"}</CardTitle>
                      <CardDescription className="text-xs">
                        {TYPE_LABELS[asset.contentType] ?? asset.contentType}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant={asset.status === "draft" ? "secondary" : "default"}>
                    {asset.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground line-clamp-4">
                  {asset.body.slice(0, 200)}...
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Created {new Date(asset.createdAt).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
