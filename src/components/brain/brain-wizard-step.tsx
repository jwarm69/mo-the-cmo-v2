"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Bot } from "lucide-react";

interface BrainWizardStepProps {
  title: string;
  description: string;
  children: React.ReactNode;
  onLetMoHelp: () => void;
  onImport: () => void;
}

export function BrainWizardStep({
  title,
  description,
  children,
  onLetMoHelp,
  onImport,
}: BrainWizardStepProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onLetMoHelp}>
            <Bot className="mr-2 h-4 w-4" />
            Let Mo Help
          </Button>
          <Button variant="outline" size="sm" onClick={onImport}>
            <Upload className="mr-2 h-4 w-4" />
            Import File
          </Button>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
