"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { BrandProfileInput } from "@/lib/brand/defaults";

interface StepProps {
  data: BrandProfileInput;
  onChange: (updates: Partial<BrandProfileInput>) => void;
  websiteUrl: string;
  onWebsiteUrlChange: (url: string) => void;
  description: string;
  onDescriptionChange: (desc: string) => void;
}

export function StepBasics({
  data,
  onChange,
  websiteUrl,
  onWebsiteUrlChange,
  description,
  onDescriptionChange,
}: StepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">The Basics</h3>
        <p className="text-sm text-muted-foreground">
          Let&apos;s get Mo up to speed on who you are.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Company Name</CardTitle>
          <CardDescription>
            What should Mo call your brand?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="company-name">
              Company Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="company-name"
              placeholder="Acme Inc."
              value={data.name}
              onChange={(e) => onChange({ name: e.target.value })}
            />
            {!data.name.trim() && (
              <p className="text-xs text-destructive">
                Company name is required to continue.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>About Your Company</CardTitle>
          <CardDescription>
            A quick overview helps Mo understand your business.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="company-description">
              What does your company do?
            </Label>
            <Textarea
              id="company-description"
              placeholder="We help small businesses manage their social media presence with AI-powered tools..."
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="website-url">Website URL (optional)</Label>
            <Input
              id="website-url"
              type="url"
              placeholder="https://yourcompany.com"
              value={websiteUrl}
              onChange={(e) => onWebsiteUrlChange(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
