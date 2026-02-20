"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Loader2, CheckCircle, FileText } from "lucide-react";

interface UploadResult {
  name: string;
  originalName: string;
  chunks: number;
}

export function KnowledgeUpload({ onUploaded }: { onUploaded?: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      setUploading(true);
      setError(null);
      setResults([]);

      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append("files", files[i]);
      }

      try {
        const res = await fetch("/api/brand/knowledge/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Upload failed");
          return;
        }

        const data = await res.json();
        setResults(data.files || []);
        onUploaded?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [onUploaded]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleUpload(e.dataTransfer.files);
    },
    [handleUpload]
  );

  return (
    <div className="space-y-3">
      <Card
        className={`border-2 border-dashed transition-colors ${
          dragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <CardContent className="flex flex-col items-center justify-center py-8">
          {uploading ? (
            <>
              <Loader2 className="mb-3 h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Uploading and indexing...
              </p>
            </>
          ) : (
            <>
              <Upload className="mb-3 h-8 w-8 text-muted-foreground" />
              <p className="mb-1 text-sm font-medium">
                Drop files here or click to upload
              </p>
              <p className="mb-3 text-xs text-muted-foreground">
                PDF, DOCX, MD, TXT files supported
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.multiple = true;
                  input.accept = ".pdf,.docx,.md,.txt,.markdown";
                  input.onchange = () => handleUpload(input.files);
                  input.click();
                }}
              >
                Choose Files
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((r, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
            >
              <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="truncate">{r.originalName}</span>
              <span className="ml-auto text-xs text-muted-foreground shrink-0">
                {r.chunks} chunks
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
