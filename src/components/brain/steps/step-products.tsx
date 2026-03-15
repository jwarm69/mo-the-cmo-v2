"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Check } from "lucide-react";

export interface ProductEntry {
  name: string;
  description: string;
  pricing: string;
  targetAudience: string;
  uniqueValue: string;
}

const EMPTY_PRODUCT: ProductEntry = {
  name: "",
  description: "",
  pricing: "",
  targetAudience: "",
  uniqueValue: "",
};

interface StepProductsProps {
  entries: ProductEntry[];
  onChange: (entries: ProductEntry[]) => void;
}

export function StepProducts({ entries, onChange }: StepProductsProps) {
  const [existingProducts, setExistingProducts] = useState<
    Array<{ id: string; name: string }>
  >([]);

  // Check for existing products via /api/products
  useEffect(() => {
    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setExistingProducts(data.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })));
        }
      })
      .catch(() => {});
  }, []);

  function addEntry() {
    onChange([...entries, { ...EMPTY_PRODUCT }]);
  }

  function removeEntry(index: number) {
    onChange(entries.filter((_, i) => i !== index));
  }

  function updateEntry(index: number, updates: Partial<ProductEntry>) {
    const next = [...entries];
    next[index] = { ...next[index], ...updates };
    onChange(next);
  }

  return (
    <div className="space-y-4">
      {existingProducts.length > 0 && (
        <div className="rounded-lg bg-muted/50 p-3 space-y-2">
          <p className="text-sm font-medium">Existing Products</p>
          <p className="text-xs text-muted-foreground">
            These products are already in Mo&apos;s database. Brain entries will be
            created automatically for any new products you add.
          </p>
          <div className="flex flex-wrap gap-2">
            {existingProducts.map((p) => (
              <Badge key={p.id} variant="secondary" className="gap-1">
                <Check className="h-3 w-3" />
                {p.name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {entries.map((entry, i) => (
        <div key={i} className="space-y-3 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Product {i + 1}</span>
            {entries.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => removeEntry(i)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Product Name</Label>
              <Input
                placeholder="e.g., Premium Meal Plan"
                value={entry.name}
                onChange={(e) => updateEntry(i, { name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Pricing</Label>
              <Input
                placeholder="e.g., $19.99/mo"
                value={entry.pricing}
                onChange={(e) => updateEntry(i, { pricing: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              placeholder="What does this product/service do?"
              value={entry.description}
              onChange={(e) => updateEntry(i, { description: e.target.value })}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Unique Value</Label>
            <Input
              placeholder="What makes it different from competitors?"
              value={entry.uniqueValue}
              onChange={(e) => updateEntry(i, { uniqueValue: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Target Audience</Label>
            <Input
              placeholder="Who is this product for?"
              value={entry.targetAudience}
              onChange={(e) => updateEntry(i, { targetAudience: e.target.value })}
            />
          </div>
        </div>
      ))}

      <Button variant="outline" onClick={addEntry} className="w-full">
        <Plus className="mr-2 h-4 w-4" />
        Add Another Product
      </Button>
    </div>
  );
}

export function productsToEntries(entries: ProductEntry[]) {
  return entries
    .filter((e) => e.name.trim())
    .map((e) => ({
      type: "product_info" as const,
      title: `Product: ${e.name}`,
      content: [
        `Product: ${e.name}`,
        e.description ? `Description: ${e.description}` : null,
        e.pricing ? `Pricing: ${e.pricing}` : null,
        e.uniqueValue ? `Unique value: ${e.uniqueValue}` : null,
        e.targetAudience ? `Target: ${e.targetAudience}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
      source: "brain_wizard",
      metadata: { ...e },
    }));
}
