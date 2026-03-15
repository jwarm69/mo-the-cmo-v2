import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import { requireAuth } from "@/lib/api/session";
import { resolveOrgFromRequest } from "@/lib/api/org";

const execAsync = promisify(exec);

/**
 * POST /api/competitors/scrape-all
 *
 * Triggers the Python Scrapling scraper for all stale competitors in an org.
 * Designed to be called by Vercel Cron or manual trigger.
 *
 * Body: { staleDays?: number }  (default: 1)
 */
export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { user } = auth;
  const body = await req.json().catch(() => ({}));
  const org = await resolveOrgFromRequest(req, body, user.orgId);

  const staleDays = (body as { staleDays?: number }).staleDays ?? 1;

  try {
    const scraperDir = path.join(process.cwd(), "scripts", "competitor-scraper");
    const { stdout, stderr } = await execAsync(
      `python3 -m competitor_scraper --org-slug ${org.slug} --stale-days ${staleDays} --json`,
      {
        cwd: scraperDir,
        timeout: 300_000, // 5 min for batch
        env: { ...process.env, PYTHONPATH: scraperDir },
      }
    );

    // Parse the JSON output from the last line of stdout
    const lines = stdout.trim().split("\n");
    const lastLine = lines[lines.length - 1];
    let results: Record<string, unknown> = {};
    try {
      results = JSON.parse(lastLine);
    } catch {
      results = { raw: stdout.trim() };
    }

    if (stderr) {
      console.warn("[scrape-all] stderr:", stderr);
    }

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Batch scrape failed";
    console.error("[scrape-all] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
