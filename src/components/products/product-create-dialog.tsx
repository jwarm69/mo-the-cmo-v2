"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Loader2, X } from "lucide-react";

export function ProductCreateDialog({
  onCreated,
}: {
  onCreated?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [uniqueValue, setUniqueValue] = useState("");
  const [pricingAmount, setPricingAmount] = useState("");
  const [pricingModel, setPricingModel] = useState("one-time");
  const [launchDate, setLaunchDate] = useState("");
  const [outcomes, setOutcomes] = useState<string[]>([]);
  const [outcomeInput, setOutcomeInput] = useState("");

  const addOutcome = () => {
    if (outcomeInput.trim()) {
      setOutcomes((prev) => [...prev, outcomeInput.trim()]);
      setOutcomeInput("");
    }
  };

  const removeOutcome = (index: number) => {
    setOutcomes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || undefined,
          uniqueValue: uniqueValue || undefined,
          pricing: pricingAmount
            ? { amount: parseFloat(pricingAmount), currency: "USD", model: pricingModel }
            : undefined,
          launchDate: launchDate || undefined,
          outcomes: outcomes.length > 0 ? outcomes : undefined,
        }),
      });
      if (res.ok) {
        setOpen(false);
        setName("");
        setDescription("");
        setUniqueValue("");
        setPricingAmount("");
        setPricingModel("one-time");
        setLaunchDate("");
        setOutcomes([]);
        onCreated?.();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Product
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Product / Offer</DialogTitle>
          <DialogDescription>
            Tell Mo about something you sell. This shapes all marketing recommendations.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
          <div className="space-y-2">
            <Label>Product Name *</Label>
            <Input
              placeholder="e.g., 6-Week Transformation Program"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              placeholder="What is this product/offer? Who is it for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>What Makes It Different?</Label>
            <Textarea
              placeholder="Your unique value proposition — why should someone choose this?"
              value={uniqueValue}
              onChange={(e) => setUniqueValue(e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>Outcomes / Transformations</Label>
            <p className="text-xs text-muted-foreground">
              What results do customers get? (e.g., &ldquo;Lose 15 lbs&rdquo;, &ldquo;Build consistent workout habit&rdquo;)
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="Add an outcome..."
                value={outcomeInput}
                onChange={(e) => setOutcomeInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addOutcome())}
              />
              <Button type="button" variant="outline" size="sm" onClick={addOutcome}>
                Add
              </Button>
            </div>
            {outcomes.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {outcomes.map((o, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs"
                  >
                    {o}
                    <button onClick={() => removeOutcome(i)}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Price ($)</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={pricingAmount}
                onChange={(e) => setPricingAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Pricing Model</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={pricingModel}
                onChange={(e) => setPricingModel(e.target.value)}
              >
                <option value="one-time">One-time</option>
                <option value="subscription">Subscription</option>
                <option value="package">Package</option>
                <option value="free">Free</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Launch Date</Label>
            <Input
              type="date"
              value={launchDate}
              onChange={(e) => setLaunchDate(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleCreate} disabled={loading || !name.trim()}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Add Product"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
