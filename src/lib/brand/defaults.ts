export interface BrandProfileInput {
  name: string;
  voice: string;
  tone: string;
  messagingPillars: string[];
  contentPillars: { name: string; ratio: number; description: string }[];
  targetAudience: {
    demographics: string;
    psychographics: string;
    painPoints: string[];
    goals: string[];
  };
  brandGuidelines: string;
  competitors: string[];
  hashtags: string[];
}

const fallbackBrandName = process.env.NEXT_PUBLIC_DEFAULT_ORG_NAME ?? "Your Brand";

function asStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const cleaned = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
  return cleaned.length > 0 ? cleaned : fallback;
}

function asContentPillars(
  value: unknown,
  fallback: BrandProfileInput["contentPillars"]
): BrandProfileInput["contentPillars"] {
  if (!Array.isArray(value)) return fallback;

  const cleaned = value
    .map((item) => {
      if (typeof item !== "object" || item === null) return null;
      const record = item as Record<string, unknown>;
      const name = typeof record.name === "string" ? record.name.trim() : "";
      const ratio =
        typeof record.ratio === "number" && Number.isFinite(record.ratio)
          ? record.ratio
          : 0;
      const description =
        typeof record.description === "string" ? record.description.trim() : "";

      if (!name) return null;
      return { name, ratio, description };
    })
    .filter((item): item is { name: string; ratio: number; description: string } =>
      Boolean(item)
    );

  return cleaned.length > 0 ? cleaned : fallback;
}

export const DEFAULT_BRAND_PROFILE: BrandProfileInput = {
  name: fallbackBrandName,
  voice: "Clear, helpful, and authentic to the audience.",
  tone: "Direct, concise, and human",
  messagingPillars: [
    "Core value proposition",
    "Audience outcomes",
    "Proof and trust",
  ],
  contentPillars: [
    {
      name: "Education",
      ratio: 40,
      description: "Teach the audience something practical and actionable.",
    },
    {
      name: "Social Proof",
      ratio: 30,
      description: "Show testimonials, wins, and real customer outcomes.",
    },
    {
      name: "Product",
      ratio: 30,
      description: "Highlight features, differentiators, and offers.",
    },
  ],
  targetAudience: {
    demographics: "Define your primary customer segment.",
    psychographics: "Motivations, behaviors, and buying triggers.",
    painPoints: ["Pain point 1", "Pain point 2", "Pain point 3"],
    goals: ["Goal 1", "Goal 2", "Goal 3"],
  },
  brandGuidelines:
    "State content standards, visual style, and non-negotiable brand rules.",
  competitors: ["Competitor 1", "Competitor 2"],
  hashtags: ["#YourBrand", "#YourCategory"],
};

export function normalizeBrandProfile(
  profile: Partial<BrandProfileInput> | null | undefined
): BrandProfileInput {
  if (!profile) return DEFAULT_BRAND_PROFILE;

  const hasTargetAudience =
    typeof profile.targetAudience === "object" && profile.targetAudience !== null;
  const targetAudience = hasTargetAudience
    ? (profile.targetAudience as Record<string, unknown>)
    : {};

  return {
    ...DEFAULT_BRAND_PROFILE,
    ...profile,
    name:
      typeof profile.name === "string" && profile.name.trim()
        ? profile.name.trim()
        : DEFAULT_BRAND_PROFILE.name,
    voice:
      typeof profile.voice === "string"
        ? profile.voice
        : DEFAULT_BRAND_PROFILE.voice,
    tone:
      typeof profile.tone === "string" ? profile.tone : DEFAULT_BRAND_PROFILE.tone,
    brandGuidelines:
      typeof profile.brandGuidelines === "string"
        ? profile.brandGuidelines
        : DEFAULT_BRAND_PROFILE.brandGuidelines,
    targetAudience: {
      ...DEFAULT_BRAND_PROFILE.targetAudience,
      demographics:
        typeof targetAudience.demographics === "string"
          ? targetAudience.demographics
          : DEFAULT_BRAND_PROFILE.targetAudience.demographics,
      psychographics:
        typeof targetAudience.psychographics === "string"
          ? targetAudience.psychographics
          : DEFAULT_BRAND_PROFILE.targetAudience.psychographics,
      painPoints: asStringArray(
        targetAudience.painPoints,
        DEFAULT_BRAND_PROFILE.targetAudience.painPoints
      ),
      goals: asStringArray(
        targetAudience.goals,
        DEFAULT_BRAND_PROFILE.targetAudience.goals
      ),
    },
    messagingPillars: asStringArray(
      profile.messagingPillars,
      DEFAULT_BRAND_PROFILE.messagingPillars
    ),
    contentPillars: asContentPillars(
      profile.contentPillars,
      DEFAULT_BRAND_PROFILE.contentPillars
    ),
    competitors: asStringArray(
      profile.competitors,
      DEFAULT_BRAND_PROFILE.competitors
    ),
    hashtags: asStringArray(profile.hashtags, DEFAULT_BRAND_PROFILE.hashtags),
  };
}
