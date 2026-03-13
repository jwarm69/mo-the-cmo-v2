"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ListOrdered } from "lucide-react";
import { QueueItem } from "@/components/queue/queue-item";
import type { ContentItem } from "@/lib/types";

export default function QueuePage() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        "/api/content?status=approved,scheduled&orderBy=scheduledAt"
      );
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
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Publish Queue</h2>
        <p className="text-muted-foreground">
          Approved and scheduled content ready to go live.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ListOrdered className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">Queue is empty</h3>
            <p className="text-sm text-muted-foreground">
              Approve or schedule content to see it here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{items.length} items</Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <QueueItem key={item.id} item={item} onUpdate={fetchItems} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
