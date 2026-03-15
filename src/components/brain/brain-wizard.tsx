"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowLeft,
  ArrowRight,
  Brain,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { BrainWizardStep } from "./brain-wizard-step";
import { BrainAssistDialog } from "./brain-assist-dialog";
import { BrainImportDialog } from "./brain-import-dialog";

import { StepAudience, audienceToEntries, type AudienceEntry } from "./steps/step-audience";
import { StepCompetitors, competitorsToEntries, type CompetitorEntry } from "./steps/step-competitors";
import { StepChannels, channelsToEntries, type ChannelEntry } from "./steps/step-channels";
import { StepContentPlans, contentPlansToEntries, type ContentPlanEntry } from "./steps/step-content-plans";
import { StepProducts, productsToEntries, type ProductEntry } from "./steps/step-products";

const STORAGE_KEY = "mo-brain-wizard-draft";

const STEPS = [
  { label: "Audience", description: "Your customers", category: "audience" },
  { label: "Competitors", description: "Your market", category: "competitors" },
  { label: "Channels", description: "Your reach", category: "channels" },
  { label: "Content", description: "Your series", category: "content_plans" },
  { label: "Products", description: "Your offerings", category: "products" },
] as const;

interface WizardDraft {
  audience: AudienceEntry[];
  competitors: CompetitorEntry[];
  channels: ChannelEntry[];
  contentPlans: ContentPlanEntry[];
  products: ProductEntry[];
  currentStep: number;
}

const EMPTY_DRAFT: WizardDraft = {
  audience: [{ name: "", emotion: "", painPoints: "", hooks: "", channels: "" }],
  competitors: [{ name: "", type: "direct", strengths: "", weaknesses: "", pricing: "" }],
  channels: [{ name: "", type: "social", frequency: "", targetIcps: "", metrics: "", budget: "" }],
  contentPlans: [{ name: "", format: "", hook: "", goal: "", frequency: "" }],
  products: [{ name: "", description: "", pricing: "", targetAudience: "", uniqueValue: "" }],
  currentStep: 0,
};

function loadDraft(): WizardDraft {
  if (typeof window === "undefined") return EMPTY_DRAFT;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_DRAFT;
    return { ...EMPTY_DRAFT, ...JSON.parse(raw) };
  } catch {
    return EMPTY_DRAFT;
  }
}

function saveDraft(draft: WizardDraft) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {}
}

function clearDraft() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export function BrainWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const [audience, setAudience] = useState<AudienceEntry[]>(() => loadDraft().audience);
  const [competitors, setCompetitors] = useState<CompetitorEntry[]>(() => loadDraft().competitors);
  const [channels, setChannels] = useState<ChannelEntry[]>(() => loadDraft().channels);
  const [contentPlans, setContentPlans] = useState<ContentPlanEntry[]>(() => loadDraft().contentPlans);
  const [products, setProducts] = useState<ProductEntry[]>(() => loadDraft().products);

  // Dialogs
  const [assistOpen, setAssistOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  // Restore step
  useEffect(() => {
    const draft = loadDraft();
    setCurrentStep(draft.currentStep);
  }, []);

  // Auto-save
  useEffect(() => {
    if (isComplete) return;
    saveDraft({
      audience,
      competitors,
      channels,
      contentPlans,
      products,
      currentStep,
    });
  }, [audience, competitors, channels, contentPlans, products, currentStep, isComplete]);

  const currentCategory = STEPS[currentStep].category;

  // Handle AI-generated entries from assist dialog
  const handleAssistEntries = useCallback(
    (entries: Array<{ type: string; title: string; content: string; metadata?: Record<string, unknown> }>) => {
      // Convert AI entries back to structured form based on current category
      switch (currentCategory) {
        case "audience":
          setAudience((prev) => [
            ...prev,
            ...entries.map((e) => ({
              name: e.metadata?.name as string ?? e.title.replace("ICP: ", ""),
              emotion: e.metadata?.emotion as string ?? "",
              painPoints: e.metadata?.painPoints as string ?? "",
              hooks: e.metadata?.hooks as string ?? "",
              channels: e.metadata?.channels as string ?? "",
            })),
          ]);
          break;
        case "competitors":
          setCompetitors((prev) => [
            ...prev,
            ...entries.map((e) => ({
              name: e.metadata?.name as string ?? e.title.replace("Competitor: ", ""),
              type: e.metadata?.type as string ?? "direct",
              strengths: e.metadata?.strengths as string ?? "",
              weaknesses: e.metadata?.weaknesses as string ?? "",
              pricing: e.metadata?.pricing as string ?? "",
            })),
          ]);
          break;
        case "channels":
          setChannels((prev) => [
            ...prev,
            ...entries.map((e) => ({
              name: e.metadata?.name as string ?? e.title.replace("Channel: ", ""),
              type: e.metadata?.type as string ?? "social",
              frequency: e.metadata?.frequency as string ?? "",
              targetIcps: e.metadata?.targetIcps as string ?? "",
              metrics: e.metadata?.metrics as string ?? "",
              budget: e.metadata?.budget as string ?? "",
            })),
          ]);
          break;
        case "content_plans":
          setContentPlans((prev) => [
            ...prev,
            ...entries.map((e) => ({
              name: e.metadata?.name as string ?? e.title.replace("Content Series: ", ""),
              format: e.metadata?.format as string ?? "",
              hook: e.metadata?.hook as string ?? "",
              goal: e.metadata?.goal as string ?? "",
              frequency: e.metadata?.frequency as string ?? "",
            })),
          ]);
          break;
        case "products":
          setProducts((prev) => [
            ...prev,
            ...entries.map((e) => ({
              name: e.metadata?.name as string ?? e.title.replace("Product: ", ""),
              description: e.metadata?.description as string ?? "",
              pricing: e.metadata?.pricing as string ?? "",
              targetAudience: e.metadata?.targetAudience as string ?? "",
              uniqueValue: e.metadata?.uniqueValue as string ?? "",
            })),
          ]);
          break;
      }
    },
    [currentCategory]
  );

  async function handleFinish() {
    setIsSubmitting(true);
    try {
      // Convert all wizard data to brain entries
      const allEntries = [
        ...audienceToEntries(audience),
        ...competitorsToEntries(competitors),
        ...channelsToEntries(channels),
        ...contentPlansToEntries(contentPlans),
        ...productsToEntries(products),
      ];

      if (allEntries.length === 0) {
        toast.error("Add at least one entry before finishing");
        setIsSubmitting(false);
        return;
      }

      const res = await fetch("/api/brain/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: allEntries }),
      });

      if (!res.ok) throw new Error("Failed to save brain entries");

      const result = await res.json();
      clearDraft();
      setIsComplete(true);
      toast.success(`${result.count} entries added to Mo's Brain!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isComplete) {
    return (
      <div className="flex items-center justify-center py-24">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-xl">Brain Built!</CardTitle>
            <CardDescription>
              Mo now has deep knowledge about your audience, competitors,
              channels, content strategy, and products. This powers all future
              content generation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button onClick={() => router.push("/brain")} className="w-full">
              <Brain className="mr-2 h-4 w-4" />
              View Your Brain
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/chat")}
              className="w-full"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Chat with Mo
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 md:space-y-8">
      {/* Header */}
      <div>
        <h2 className="flex items-center gap-2 text-xl md:text-2xl font-bold tracking-tight">
          <Brain className="h-5 w-5 md:h-6 md:w-6" />
          Build Mo&apos;s Brain
        </h2>
        <p className="text-sm md:text-base text-muted-foreground">
          Teach Mo everything about your business in 5 quick steps. You can use
          the form, let Mo help, or import existing data.
        </p>
      </div>

      {/* Progress */}
      <div className="space-y-3">
        <div className="flex justify-between">
          {STEPS.map((step, i) => (
            <button
              key={i}
              type="button"
              className={`flex flex-col items-center gap-1 text-xs transition-colors ${
                i === currentStep
                  ? "text-primary font-medium"
                  : i < currentStep
                    ? "text-primary/60"
                    : "text-muted-foreground"
              }`}
              onClick={() => {
                if (i <= currentStep) setCurrentStep(i);
              }}
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors ${
                  i === currentStep
                    ? "border-primary bg-primary text-primary-foreground"
                    : i < currentStep
                      ? "border-primary/60 bg-primary/10 text-primary"
                      : "border-muted-foreground/30"
                }`}
              >
                {i < currentStep ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  i + 1
                )}
              </div>
              <span className="hidden sm:block">{step.label}</span>
            </button>
          ))}
        </div>
        <div className="h-1.5 rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Step Content */}
      <div>
        {currentStep === 0 && (
          <BrainWizardStep
            title="Tell Mo about your customers"
            description="Who are you selling to? Define your ideal customer profiles."
            onLetMoHelp={() => setAssistOpen(true)}
            onImport={() => setImportOpen(true)}
          >
            <StepAudience entries={audience} onChange={setAudience} />
          </BrainWizardStep>
        )}
        {currentStep === 1 && (
          <BrainWizardStep
            title="Who's competing for your customers?"
            description="Help Mo understand your competitive landscape."
            onLetMoHelp={() => setAssistOpen(true)}
            onImport={() => setImportOpen(true)}
          >
            <StepCompetitors entries={competitors} onChange={setCompetitors} />
          </BrainWizardStep>
        )}
        {currentStep === 2 && (
          <BrainWizardStep
            title="Where do you reach your audience?"
            description="Which marketing channels are you active on?"
            onLetMoHelp={() => setAssistOpen(true)}
            onImport={() => setImportOpen(true)}
          >
            <StepChannels entries={channels} onChange={setChannels} />
          </BrainWizardStep>
        )}
        {currentStep === 3 && (
          <BrainWizardStep
            title="What content does your brand create?"
            description="Define your recurring content series and formats."
            onLetMoHelp={() => setAssistOpen(true)}
            onImport={() => setImportOpen(true)}
          >
            <StepContentPlans entries={contentPlans} onChange={setContentPlans} />
          </BrainWizardStep>
        )}
        {currentStep === 4 && (
          <BrainWizardStep
            title="What does your business sell?"
            description="Tell Mo about your products and services."
            onLetMoHelp={() => setAssistOpen(true)}
            onImport={() => setImportOpen(true)}
          >
            <StepProducts entries={products} onChange={setProducts} />
          </BrainWizardStep>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between border-t pt-6">
        <Button
          variant="outline"
          onClick={() => setCurrentStep((s) => s - 1)}
          disabled={currentStep === 0}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="flex items-center gap-2">
          {currentStep < STEPS.length - 1 && (
            <Button
              variant="ghost"
              onClick={() => setCurrentStep((s) => s + 1)}
            >
              Skip
            </Button>
          )}

          {currentStep < STEPS.length - 1 ? (
            <Button onClick={() => setCurrentStep((s) => s + 1)}>
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleFinish} disabled={isSubmitting}>
              {isSubmitting ? "Building Brain..." : "Finish & Build Brain"}
            </Button>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <BrainAssistDialog
        open={assistOpen}
        onOpenChange={setAssistOpen}
        category={currentCategory}
        onEntriesGenerated={handleAssistEntries}
      />
      <BrainImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={() => {
          toast.success("Entries imported! They'll appear in the Brain dashboard.");
        }}
      />
    </div>
  );
}
