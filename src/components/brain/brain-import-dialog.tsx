"use client";

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, FileText, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import YAML from "yaml";
import { getTypeLabel } from "./brain-entry-card";

// Maps YAML file names / category keys to context types
const CATEGORY_TYPE_MAP: Record<string, string> = {
  icps: "icp_insight",
  audience: "audience_insight",
  competitors: "market_insight",
  channels: "channel_insight",
  "content-series": "plan_context",
  content_plans: "plan_context",
  restaurants: "product_info",
  products: "product_info",
};

interface ParsedEntry {
  type: string;
  title: string;
  content: string;
  sourceId?: string;
  metadata?: Record<string, unknown>;
}

function parseYamlToEntries(text: string, fileName: string): ParsedEntry[] {
  const parsed = YAML.parse(text);
  const entries: ParsedEntry[] = [];

  // Determine category from file name
  const baseName = fileName.replace(/\.(ya?ml|json)$/i, "").toLowerCase();
  const defaultType = CATEGORY_TYPE_MAP[baseName] ?? "business_info";

  // Handle different YAML structures
  const items = Array.isArray(parsed) ? parsed : parsed?.items ?? parsed?.entries ?? [parsed];

  for (const item of items) {
    if (!item || typeof item !== "object") continue;

    const title = item.name ?? item.title ?? item.id ?? "Untitled";
    const type = CATEGORY_TYPE_MAP[item.category] ?? defaultType;

    // Build content from all fields except id/name
    const contentParts: string[] = [];
    for (const [key, value] of Object.entries(item)) {
      if (["id", "name", "title", "category"].includes(key)) continue;
      if (value === null || value === undefined) continue;

      if (Array.isArray(value)) {
        contentParts.push(`${key}: ${value.join(", ")}`);
      } else if (typeof value === "object") {
        contentParts.push(`${key}: ${JSON.stringify(value)}`);
      } else {
        contentParts.push(`${key}: ${value}`);
      }
    }

    entries.push({
      type,
      title: String(title),
      content: contentParts.join("\n") || String(title),
      sourceId: item.id ? String(item.id) : undefined,
      metadata: item,
    });
  }

  return entries;
}

interface BrainImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

export function BrainImportDialog({
  open,
  onOpenChange,
  onImported,
}: BrainImportDialogProps) {
  const [entries, setEntries] = useState<ParsedEntry[]>([]);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    setError("");
    setFileName(file.name);

    try {
      const text = await file.text();
      let parsed: ParsedEntry[];

      if (file.name.endsWith(".json")) {
        const json = JSON.parse(text);
        const items = Array.isArray(json) ? json : json.entries ?? [json];
        parsed = items.map((item: Record<string, unknown>) => ({
          type: (item.type as string) ?? "business_info",
          title: (item.title as string) ?? (item.name as string) ?? "Untitled",
          content: (item.content as string) ?? JSON.stringify(item),
          sourceId: item.id ? String(item.id) : undefined,
          metadata: item,
        }));
      } else {
        parsed = parseYamlToEntries(text, file.name);
      }

      if (parsed.length === 0) {
        setError("No entries found in file");
        return;
      }

      setEntries(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse file");
      setEntries([]);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  async function handleImport() {
    if (entries.length === 0) return;
    setImporting(true);

    try {
      const res = await fetch("/api/brain/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries, source: "yaml_import" }),
      });

      if (!res.ok) throw new Error("Import failed");

      const result = await res.json();
      toast.success(
        `Imported ${result.imported} entries${result.skipped ? `, ${result.skipped} skipped (duplicates)` : ""}`
      );
      onOpenChange(false);
      setEntries([]);
      setFileName("");
      onImported();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Import Brain Data</DialogTitle>
          <DialogDescription>
            Upload YAML or JSON files to bulk-import knowledge into Mo&apos;s Brain.
            Compatible with Bite Club Brain format.
          </DialogDescription>
        </DialogHeader>

        {entries.length === 0 ? (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 text-center transition-colors hover:border-primary/50"
          >
            <Upload className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Drop a YAML or JSON file here</p>
              <p className="text-xs text-muted-foreground">
                or click to browse
              </p>
            </div>
            <input
              type="file"
              accept=".yaml,.yml,.json"
              className="absolute inset-0 cursor-pointer opacity-0"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4" />
              <span className="font-medium">{fileName}</span>
              <Badge variant="secondary">{entries.length} entries</Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEntries([]);
                  setFileName("");
                }}
              >
                Change file
              </Button>
            </div>

            <ScrollArea className="h-64 rounded border">
              <div className="space-y-2 p-3">
                {entries.map((entry, i) => {
                  const typeInfo = getTypeLabel(entry.type);
                  return (
                    <div
                      key={i}
                      className="flex items-start gap-2 rounded-lg bg-muted/50 p-2 text-sm"
                    >
                      <Badge
                        variant="secondary"
                        className={`shrink-0 text-xs ${typeInfo.color}`}
                      >
                        {typeInfo.label}
                      </Badge>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{entry.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {entry.content}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={entries.length === 0 || importing}
          >
            {importing
              ? "Importing..."
              : `Import ${entries.length} entries`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
