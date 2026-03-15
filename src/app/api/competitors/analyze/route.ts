import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import { requireAuth } from "@/lib/api/session";
import { resolveOrgFromRequest } from "@/lib/api/org";
import { db } from "@/lib/db/client";
import { competitorProfiles, competitorContent } from "@/lib/db/schema";
import { scrapeUrl } from "@/lib/competitors/scraper";
import { analyzeCompetitorContent } from "@/lib/competitors/analyzer";
import { captureContext } from "@/lib/brain/context-brain";

const execAsync = promisify(exec);

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
  const socialProfiles = (profile.socialProfiles as Record<string, string>) ?? {};
  const socialUrls = Object.values(socialProfiles).filter(Boolean);
  const allUrls = [...new Set([...urls, ...socialUrls])];

  if (allUrls.length === 0) {
    return NextResponse.json(
      { error: "No URLs configured for this competitor" },
      { status: 400 }
    );
  }

  try {
    // Step 1: Try Python Scrapling scraper first
    let usedPythonScraper = false;
    try {
      const scraperDir = path.join(process.cwd(), "scripts", "competitor-scraper");
      await execAsync(
        `python3 -m competitor_scraper --competitor-id ${profile.id} --json`,
        {
          cwd: scraperDir,
          timeout: 120_000, // 2 min timeout
          env: { ...process.env, PYTHONPATH: scraperDir },
        }
      );
      usedPythonScraper = true;
      console.log(
        `[competitors/analyze] Python scraper succeeded for ${profile.name}`
      );
    } catch (pyErr) {
      console.warn(
        `[competitors/analyze] Python scraper failed, falling back to TypeScript scraper:`,
        pyErr instanceof Error ? pyErr.message : pyErr
      );
    }

    // Step 2: If Python scraper failed, fall back to TypeScript scraper
    if (!usedPythonScraper) {
      for (const url of allUrls) {
        const result = await scrapeUrl(url);
        if (!result) continue;

        const platform = detectPlatform(url);

        await db.insert(competitorContent).values({
          competitorId: profile.id,
          orgId: org.id,
          url,
          content: result.content,
          platform,
        });
      }
    }

    // Step 3: Read freshly scraped content from DB
    const scraped = await db
      .select()
      .from(competitorContent)
      .where(eq(competitorContent.competitorId, profile.id));

    if (scraped.length === 0) {
      return NextResponse.json(
        { error: "Could not fetch content from any of the configured URLs" },
        { status: 422 }
      );
    }

    // Step 4: Send all scraped content to GPT-4o-mini for analysis
    const contentForAnalysis = scraped.map((row) => ({
      url: row.url ?? "",
      content: row.content,
      platform: row.platform ?? undefined,
    }));
    const analysis = await analyzeCompetitorContent(contentForAnalysis);

    // Step 5: Update content rows with the analysis JSON
    for (const item of scraped) {
      await db
        .update(competitorContent)
        .set({ analysis })
        .where(eq(competitorContent.id, item.id));
    }

    // Step 6: Store a summary as brain context (market_insight)
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
        metadata: {
          competitorName: profile.name,
          urlsAnalyzed: scraped.length,
          scraper: usedPythonScraper ? "scrapling" : "typescript",
        },
      });
    } catch {
      // Non-critical -- brain capture failure should not block the response
    }

    // Step 7: Update lastScrapedAt on competitor profile
    await db
      .update(competitorProfiles)
      .set({ lastScrapedAt: new Date(), updatedAt: new Date() })
      .where(eq(competitorProfiles.id, competitorId));

    return NextResponse.json({
      success: true,
      analyzed: scraped.length,
      analysis,
      scraper: usedPythonScraper ? "scrapling" : "typescript",
    });
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
