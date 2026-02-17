"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, FileText, Loader2 } from "lucide-react";

interface KnowledgeDoc {
  id: string;
  title: string;
  sourceType: string;
  chunkCount: number;
  createdAt: string;
}

interface KnowledgeData {
  initialized: boolean;
  documentCount: number;
  totalChunks: number;
  documents: KnowledgeDoc[];
}

export function KnowledgeList() {
  const [data, setData] = useState<KnowledgeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [reindexing, setReindexing] = useState(false);

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/brand/knowledge");
      if (res.ok) {
        setData(await res.json());
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReindex = async () => {
    setReindexing(true);
    try {
      const res = await fetch("/api/brand/knowledge/ingest", {
        method: "POST",
      });
      if (res.ok) {
        await fetchDocs();
      }
    } finally {
      setReindexing(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {data?.initialized
              ? `${data.documentCount} documents indexed, ${data.totalChunks} total chunks`
              : "Knowledge base not yet initialized. It will auto-initialize on first chat."}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleReindex}
          disabled={reindexing}
        >
          {reindexing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Re-indexing...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Re-index
            </>
          )}
        </Button>
      </div>

      {data?.documents.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">
              No documents indexed
            </h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Place .md files in the knowledge/ directory and click Re-index.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3">
        {data?.documents.map((doc) => (
          <Card key={doc.id}>
            <CardHeader className="py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">
                  {doc.title}
                </CardTitle>
                <div className="flex gap-2">
                  <Badge variant="secondary">
                    {doc.chunkCount} chunks
                  </Badge>
                  <Badge variant="outline">{doc.sourceType}</Badge>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
