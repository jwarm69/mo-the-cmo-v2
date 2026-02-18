"use client";

import { useCallback, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Upload,
  FileText,
  X,
  Loader2,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { buildClientApiHeaders } from "@/lib/client-config";
import { toast } from "sonner";

interface UploadedFile {
  file: File;
  id: string;
}

interface DistillResult {
  category: string;
  summary: string;
}

interface StepKnowledgeProps {
  brandContext: string;
}

const ACCEPTED_TYPES = ".md,.txt,.pdf,.docx";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function StepKnowledge({ brandContext }: StepKnowledgeProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [pastedText, setPastedText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [isDistilling, setIsDistilling] = useState(false);
  const [distillResults, setDistillResults] = useState<DistillResult[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  function addFiles(files: FileList | File[]) {
    const newFiles = Array.from(files).map((file) => ({
      file,
      id: `${file.name}-${Date.now()}-${Math.random()}`,
    }));
    setUploadedFiles((prev) => [...prev, ...newFiles]);
    setUploadComplete(false);
  }

  function removeFile(id: string) {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
    setUploadComplete(false);
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  }, []);

  async function handleUpload() {
    if (uploadedFiles.length === 0 && !pastedText.trim()) {
      toast.error("Add files or paste text before uploading.");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      for (const { file } of uploadedFiles) {
        formData.append("files", file);
      }
      if (pastedText.trim()) {
        formData.append("pastedText", pastedText.trim());
      }

      const res = await fetch("/api/brand/knowledge/upload", {
        method: "POST",
        headers: buildClientApiHeaders(),
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string }).error ?? "Upload failed"
        );
      }

      setUploadComplete(true);
      toast.success("Documents uploaded successfully.");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Upload failed";
      toast.error(msg);
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDistill() {
    setIsDistilling(true);
    setDistillResults([]);
    try {
      const res = await fetch("/api/brand/knowledge/distill", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...buildClientApiHeaders(),
        },
        body: JSON.stringify({ brandContext }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string }).error ?? "Distillation failed"
        );
      }

      const data = (await res.json()) as { results?: DistillResult[] };
      setDistillResults(data.results ?? []);
      toast.success("Mo has extracted insights from your documents.");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Distillation failed";
      toast.error(msg);
    } finally {
      setIsDistilling(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Deep Context</h3>
        <p className="text-sm text-muted-foreground">
          Upload your existing marketing docs so Mo can learn from them.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload Documents</CardTitle>
          <CardDescription>
            Drag and drop files or click to browse. Accepts .md, .txt, .pdf,
            .docx.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors cursor-pointer ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-muted-foreground/50"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">
              Drop files here or click to browse
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              .md, .txt, .pdf, .docx
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES}
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          {uploadedFiles.length > 0 && (
            <div className="space-y-2">
              {uploadedFiles.map(({ file, id }) => (
                <div
                  key={id}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => removeFile(id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Or Paste Content</CardTitle>
          <CardDescription>
            Paste marketing copy, brand docs, or any text Mo should learn from.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Paste your brand guidelines, marketing copy, or any relevant text..."
            value={pastedText}
            onChange={(e) => {
              setPastedText(e.target.value);
              setUploadComplete(false);
            }}
            rows={6}
          />
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button
          onClick={handleUpload}
          disabled={
            isUploading ||
            (uploadedFiles.length === 0 && !pastedText.trim())
          }
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : uploadComplete ? (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Uploaded
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload
            </>
          )}
        </Button>

        {uploadComplete && (
          <Button
            variant="secondary"
            onClick={handleDistill}
            disabled={isDistilling}
          >
            {isDistilling ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Let Mo Analyze
              </>
            )}
          </Button>
        )}
      </div>

      {distillResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Insights Extracted
            </CardTitle>
            <CardDescription>
              Mo has processed your documents and extracted these insights.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {distillResults.map((result, i) => (
              <div key={i} className="rounded-md border p-3 space-y-1">
                <p className="text-sm font-medium">{result.category}</p>
                <p className="text-sm text-muted-foreground">
                  {result.summary}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
