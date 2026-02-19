"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  DEFAULT_BRAND_PROFILE,
  type BrandProfileInput,
} from "@/lib/brand/defaults";
import { buildClientApiHeaders } from "@/lib/client-config";
import { StepBasics } from "./step-basics";
import { StepVoice } from "./step-voice";
import { StepCustomers } from "./step-customers";
import { StepContent } from "./step-content";
import { StepKnowledge } from "./step-knowledge";

const STEPS = [
  { label: "Basics", description: "Company info" },
  { label: "Voice", description: "Brand personality" },
  { label: "Customers", description: "Target audience" },
  { label: "Content", description: "Strategy & pillars" },
  { label: "Deep Context", description: "Upload docs" },
] as const;

const STORAGE_KEY = "mo-setup-wizard-draft";

interface WizardDraft {
  data: BrandProfileInput;
  websiteUrl: string;
  description: string;
  activePlatforms: string[];
  currentStep: number;
}

function loadDraft(): WizardDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as WizardDraft;
  } catch {
    return null;
  }
}

function saveDraft(draft: WizardDraft) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Ignore storage errors
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

export function SetupWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isFinishing, setIsFinishing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const [data, setData] = useState<BrandProfileInput>(() => {
    const draft = loadDraft();
    return draft?.data ?? { ...DEFAULT_BRAND_PROFILE, name: "" };
  });

  const [websiteUrl, setWebsiteUrl] = useState(() => {
    const draft = loadDraft();
    return draft?.websiteUrl ?? "";
  });

  const [description, setDescription] = useState(() => {
    const draft = loadDraft();
    return draft?.description ?? "";
  });

  const [activePlatforms, setActivePlatforms] = useState<string[]>(() => {
    const draft = loadDraft();
    return draft?.activePlatforms ?? [];
  });

  // Restore step from draft on mount
  useEffect(() => {
    const draft = loadDraft();
    if (draft?.currentStep != null) {
      setCurrentStep(draft.currentStep);
    }
  }, []);

  // Auto-save to localStorage on changes
  useEffect(() => {
    if (isComplete) return;
    saveDraft({ data, websiteUrl, description, activePlatforms, currentStep });
  }, [data, websiteUrl, description, activePlatforms, currentStep, isComplete]);

  const handleDataChange = useCallback(
    (updates: Partial<BrandProfileInput>) => {
      setData((prev) => {
        const next = { ...prev };
        for (const [key, value] of Object.entries(updates)) {
          if (key === "targetAudience" && typeof value === "object") {
            next.targetAudience = {
              ...prev.targetAudience,
              ...(value as Partial<BrandProfileInput["targetAudience"]>),
            };
          } else {
            (next as Record<string, unknown>)[key] = value;
          }
        }
        return next;
      });
    },
    []
  );

  const canAdvance = currentStep === 0 ? data.name.trim().length > 0 : true;

  async function handleFinish() {
    setIsFinishing(true);
    try {
      // Merge description into psychographics if present
      const finalData = { ...data };
      if (description.trim()) {
        finalData.targetAudience = {
          ...finalData.targetAudience,
          psychographics: description.trim(),
        };
      }

      // Derive org slug from brand name
      const orgSlug = finalData.name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "my-brand";

      const res = await fetch("/api/brand", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...buildClientApiHeaders(),
        },
        body: JSON.stringify({
          orgSlug,
          orgName: finalData.name,
          ...finalData,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string }).error ?? "Failed to save brand profile"
        );
      }

      clearDraft();
      setIsComplete(true);
      toast.success("Brand profile saved!");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to save";
      toast.error(msg);
    } finally {
      setIsFinishing(false);
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
            <CardTitle className="text-xl">
              Mo is trained on {data.name}!
            </CardTitle>
            <CardDescription>
              Your brand profile is set up. Mo is ready to create content that
              sounds like you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/chat")} className="w-full">
              <Sparkles className="mr-2 h-4 w-4" />
              Start Chatting with Mo
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Header */}
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Sparkles className="h-6 w-6" />
          Set Up Your Brand
        </h2>
        <p className="text-muted-foreground">
          Walk Mo through your brand in a few quick steps. You can always edit
          this later.
        </p>
      </div>

      {/* Progress Bar */}
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
                // Allow clicking on completed steps or current step
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
          <StepBasics
            data={data}
            onChange={handleDataChange}
            websiteUrl={websiteUrl}
            onWebsiteUrlChange={setWebsiteUrl}
            description={description}
            onDescriptionChange={setDescription}
          />
        )}
        {currentStep === 1 && (
          <StepVoice data={data} onChange={handleDataChange} />
        )}
        {currentStep === 2 && (
          <StepCustomers data={data} onChange={handleDataChange} />
        )}
        {currentStep === 3 && (
          <StepContent
            data={data}
            onChange={handleDataChange}
            activePlatforms={activePlatforms}
            onPlatformsChange={setActivePlatforms}
          />
        )}
        {currentStep === 4 && (
          <StepKnowledge
            brandContext={`${data.name}: ${description || data.voice}`}
          />
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
          {currentStep < STEPS.length - 1 && currentStep > 0 && (
            <Button
              variant="ghost"
              onClick={() => setCurrentStep((s) => s + 1)}
            >
              Skip
            </Button>
          )}

          {currentStep < STEPS.length - 1 ? (
            <Button
              onClick={() => setCurrentStep((s) => s + 1)}
              disabled={!canAdvance}
            >
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleFinish} disabled={isFinishing}>
              {isFinishing ? "Saving..." : "Finish Setup"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
