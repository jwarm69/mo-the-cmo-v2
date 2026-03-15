"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Brain,
  Plus,
  Search,
  Upload,
  Sparkles,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { BrainEntryCard, getTypeLabel, type BrainEntry } from "./brain-entry-card";
import { BrainEntryDialog } from "./brain-entry-dialog";
import { BrainImportDialog } from "./brain-import-dialog";

const CATEGORY_TABS = [
  { key: "all", label: "All" },
  { key: "audience_insight,icp_insight", label: "Audience" },
  { key: "market_insight", label: "Competitors" },
  { key: "channel_insight,strategy_decision", label: "Channels" },
  { key: "plan_context", label: "Content Plans" },
  { key: "product_info", label: "Products" },
  { key: "business_info,brand_voice,goal_context,performance_insight,positioning_insight,conversation_extract", label: "Other" },
];

export function BrainDashboard() {
  const router = useRouter();
  const [entries, setEntries] = useState<BrainEntry[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  // Dialogs
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<BrainEntry | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);

      // If filtering by category tab, pick the first type (server filters by single type)
      // For multi-type tabs we fetch all and filter client-side
      const typeFilter = activeTab !== "all" ? activeTab.split(",")[0] : undefined;
      if (typeFilter && !activeTab.includes(",")) {
        params.set("type", typeFilter);
      }

      const res = await fetch(`/api/brain/entries?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");

      const data = await res.json();
      setEntries(data.entries);
      setCounts(data.counts);
      setTotal(data.total);
    } catch {
      toast.error("Failed to load brain entries");
    } finally {
      setLoading(false);
    }
  }, [search, activeTab]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const filteredEntries =
    activeTab === "all"
      ? entries
      : entries.filter((e) => activeTab.split(",").includes(e.type));

  function handleEdit(entry: BrainEntry) {
    setEditingEntry(entry);
    setEntryDialogOpen(true);
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/brain/entries/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Entry removed");
      fetchEntries();
    } catch {
      toast.error("Failed to delete entry");
    }
  }

  function handleCreate() {
    setEditingEntry(null);
    setEntryDialogOpen(true);
  }

  const tabCount = (tabKey: string) => {
    if (tabKey === "all") return total;
    const types = tabKey.split(",");
    return types.reduce((sum, t) => sum + (counts[t] ?? 0), 0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Brain className="h-6 w-6" />
            Mo&apos;s Brain
          </h1>
          <p className="text-sm text-muted-foreground">
            {total} knowledge entries powering all of Mo&apos;s content generation
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Button variant="outline" size="sm" onClick={() => router.push("/brain/wizard")}>
            <Sparkles className="mr-2 h-4 w-4" />
            Wizard
          </Button>
          <Button size="sm" onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Entry
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search brain entries..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start overflow-x-auto">
          {CATEGORY_TABS.map((tab) => (
            <TabsTrigger key={tab.key} value={tab.key} className="gap-1.5">
              {tab.label}
              <Badge variant="secondary" className="ml-1 text-xs">
                {tabCount(tab.key)}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        {CATEGORY_TABS.map((tab) => (
          <TabsContent key={tab.key} value={tab.key}>
            {loading ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Loading...
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">No entries yet</p>
                  <p className="text-sm text-muted-foreground">
                    {tab.key === "all"
                      ? "Start building Mo's Brain with the wizard or add entries manually."
                      : `No ${tab.label.toLowerCase()} entries yet.`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push("/brain/wizard")}
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Use Wizard
                  </Button>
                  <Button size="sm" onClick={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Entry
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredEntries.map((entry) => (
                  <BrainEntryCard
                    key={entry.id}
                    entry={entry}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Dialogs */}
      <BrainEntryDialog
        open={entryDialogOpen}
        onOpenChange={setEntryDialogOpen}
        entry={editingEntry}
        onSaved={fetchEntries}
      />
      <BrainImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImported={fetchEntries}
      />
    </div>
  );
}
