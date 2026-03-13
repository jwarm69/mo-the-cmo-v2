import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/api/session";
import { resolveOrgFromRequest } from "@/lib/api/org";
import { db } from "@/lib/db/client";
import { competitorProfiles, competitorContent } from "@/lib/db/schema";
import { scrapeUrl } from "@/lib/competitors/scraper";
import { analyzeCompetitorContent } from "@/lib/competitors/analyzer";
import { captureContext } from "@/lib/brain/context-brain";

export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { user } = auth;
  const body = await req.json();
  const org = await resolveOrgFromRequest(req, body, user.orgId);

  const { competitorId } = body as { competitorId: string };
  if (!competitorId) {
    return NextResponse.json(
      { error: "competitorId is required" },
      { status: 400 }
    );
  }

  const [profile] = await db
    .select()
    .from(competitorProfiles)
    .where(
      and(
        eq(competitorProfiles.id, competitorId),
        eq(competitorProfiles.orgId, org.id)
      )
    )
    .limit(1);

  if (!profile) {
    return NextResponse.json(
      { error: "Competitor not found" },
      { status: 404 }
    );
  }

  const urls = (profile.urls as string[]) ?? [];
  if (urls.length === 0) {
    return NextResponse.json(
      { error: "No URLs configured for this competitor" },
      { status: 400 }
    );
  }

  try {
    // Step 1: Scrape each URL and store raw content
    const scraped: { url: string; content: string; platform?: string }[] = [];

    for (const url of urls) {
      const result = await scrapeUrl(url);
      if (!result) continue;

      // Detect platform from URL
      const platform = detectPlatform(url);

      // Store raw scraped content in competitorContent table
      await db.insert(competitorContent).values({
        competitorId: profile.id,
        orgId: org.id,
        url,
        content: result.content,
        platform,
      });

      scraped.push({ url, content: result.content, platform: platform ?? undefined });
    }

    if (scraped.length === 0) {
      return NextResponse.json(
        { error: "Could not fetch content from any of the configured URLs" },
        { status: 422 }
      );
    }

    // Step 2: Send all scraped content to GPT-4o-mini for analysis
    const analysis = await analyzeCompetitorContent(scraped);

    // Step 3: Update the most recently inserted content rows with the analysis JSON
    // We store the analysis on each content row so it is available per-entry
    for (const item of scraped) {
      await db
        .update(competitorContent)
        .set({ analysis })
        .where(
          and(
            eq(competitorContent.competitorId, profile.id),
            eq(competitorContent.url, item.url)
          )
        );
    }

    // Step 4: Store a summary as brain context (market_insight)
    const analysisText =
      typeof analysis === "object"
        ? JSON.stringify(analysis, null, 2)
        : String(analysis);

    try {
      await captureContext({
        orgId: org.id,
        type: "market_insight",
        title: `Competitor Analysis: ${profile.name}`,
        content: analysisText.slice(0, 8000),
        source: "competitor_analysis",
        sourceId: profile.id,
        confidence: 0.7,
        metadata: { competitorName: profile.name, urlsAnalyzed: scraped.length },
      });
    } catch {
      // Non-critical -- brain capture failure should not block the response
    }

    // Step 5: Update lastScrapedAt on competitor profile
    await db
      .update(competitorProfiles)
      .set({ lastScrapedAt: new Date(), updatedAt: new Date() })
      .where(eq(competitorProfiles.id, competitorId));

    return NextResponse.json({ success: true, analyzed: scraped.length, analysis });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function detectPlatform(url: string): string | null {
  if (url.includes("instagram.com")) return "instagram";
  if (url.includes("tiktok.com")) return "tiktok";
  if (url.includes("twitter.com") || url.includes("x.com")) return "twitter";
  if (url.includes("facebook.com")) return "facebook";
  if (url.includes("linkedin.com")) return "linkedin";
  return null;
}
