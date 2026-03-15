"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Sparkles, Check } from "lucide-react";
import { toast } from "sonner";
import { getTypeLabel } from "./brain-entry-card";

const CATEGORY_QUESTIONS: Record<string, string[]> = {
  audience: [
    "Who are your main customer segments? Describe them in your own words.",
    "What are their biggest pain points or frustrations?",
    "What motivates them to buy? What do they value most?",
  ],
  competitors: [
    "Who are your top 3-5 competitors (direct and indirect)?",
    "What do they do well? What are their weaknesses?",
    "How is your offering different or better?",
  ],
  channels: [
    "Where do you currently reach your audience? (social, email, events, etc.)",
    "Which channels perform best for you? Which ones are you exploring?",
    "How often do you post/engage on each channel?",
  ],
  content_plans: [
    "What types of content do you create regularly? (posts, videos, newsletters, etc.)",
    "What content resonates most with your audience?",
    "What content series or recurring formats do you have (or want)?",
  ],
  products: [
    "What products or services do you offer?",
    "What makes each one unique? What outcomes do customers get?",
    "How are they priced? Who is each one for?",
  ],
};

interface GeneratedEntry {
  type: string;
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
}

interface BrainAssistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: string;
  onEntriesGenerated: (entries: GeneratedEntry[]) => void;
}

export function BrainAssistDialog({
  open,
  onOpenChange,
  category,
  onEntriesGenerated,
}: BrainAssistDialogProps) {
  const questions = CATEGORY_QUESTIONS[category] ?? [];
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<string[]>(questions.map(() => ""));
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<GeneratedEntry[]>([]);
  const [step, setStep] = useState<"questions" | "review">("questions");

  function reset() {
    setCurrentQ(0);
    setAnswers(questions.map(() => ""));
    setGenerating(false);
    setGenerated([]);
    setStep("questions");
  }

  async function handleGenerate() {
    const filledAnswers = answers.filter((a) => a.trim());
    if (filledAnswers.length === 0) {
      toast.error("Please answer at least one question");
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch("/api/brain/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, answers: filledAnswers }),
      });

      if (!res.ok) throw new Error("AI generation failed");

      const data = await res.json();
      setGenerated(data.entries ?? []);
      setStep("review");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  function handleAccept() {
    onEntriesGenerated(generated);
    onOpenChange(false);
    reset();
    toast.success(`${generated.length} entries added to draft`);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Let Mo Help
          </DialogTitle>
          <DialogDescription>
            {step === "questions"
              ? "Answer a few questions and Mo will generate structured brain entries for you."
              : "Review the entries Mo generated. Accept to add them to your draft."}
          </DialogDescription>
        </DialogHeader>

        {step === "questions" ? (
          <div className="space-y-4">
            {questions.map((q, i) => (
              <div
                key={i}
                className={i === currentQ ? "space-y-2" : "hidden"}
              >
                <p className="text-sm font-medium">
                  Question {i + 1} of {questions.length}
                </p>
                <p className="text-sm text-muted-foreground">{q}</p>
                <Textarea
                  value={answers[i]}
                  onChange={(e) => {
                    const next = [...answers];
                    next[i] = e.target.value;
                    setAnswers(next);
                  }}
                  rows={4}
                  placeholder="Type your answer..."
                />
              </div>
            ))}

            <div className="flex items-center gap-2">
              {questions.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCurrentQ(i)}
                  className={`h-2 w-2 rounded-full transition-colors ${
                    i === currentQ
                      ? "bg-primary"
                      : answers[i]?.trim()
                        ? "bg-primary/40"
                        : "bg-muted-foreground/20"
                  }`}
                />
              ))}
            </div>
          </div>
        ) : (
          <ScrollArea className="h-64">
            <div className="space-y-2 pr-3">
              {generated.map((entry, i) => {
                const typeInfo = getTypeLabel(entry.type);
                return (
                  <div
                    key={i}
                    className="rounded-lg border p-3 space-y-1"
                  >
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={`text-xs ${typeInfo.color}`}
                      >
                        {typeInfo.label}
                      </Badge>
                      <span className="text-sm font-medium">{entry.title}</span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {entry.content}
                    </p>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          {step === "questions" ? (
            <>
              {currentQ > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setCurrentQ((q) => q - 1)}
                >
                  Previous
                </Button>
              )}
              {currentQ < questions.length - 1 ? (
                <Button onClick={() => setCurrentQ((q) => q + 1)}>
                  Next Question
                </Button>
              ) : (
                <Button onClick={handleGenerate} disabled={generating}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  {generating ? "Generating..." : "Generate Entries"}
                </Button>
              )}
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep("questions")}>
                Back to Questions
              </Button>
              <Button onClick={handleAccept}>
                <Check className="mr-2 h-4 w-4" />
                Accept {generated.length} Entries
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
