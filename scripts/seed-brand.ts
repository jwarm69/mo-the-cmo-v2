/**
 * One-shot seed script to push the Bite Club brand profile to the database via API.
 *
 * Usage:
 *   npx tsx scripts/seed-brand.ts
 *
 * Requires the dev server to be running (npx next dev) or a built app.
 * Reads APP_API_KEY from .env.local automatically.
 */

import fs from "fs";
import path from "path";
import { EXAMPLE_BRAND_SEED } from "../src/lib/seed/bite-club";

async function main() {
  const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

  if (!process.env.APP_API_KEY) {
    const envPath = path.join(__dirname, "..", ".env.local");
    try {
      const envContent = fs.readFileSync(envPath, "utf-8");
      const match = envContent.match(/^APP_API_KEY=(.+)$/m);
      if (match) {
        process.env.APP_API_KEY = match[1].trim();
      }
    } catch {
      // ignore
    }
  }

  const apiKey = process.env.APP_API_KEY;
  if (!apiKey) {
    console.error("Error: APP_API_KEY not found in environment or .env.local");
    process.exit(1);
  }

  const payload = {
    ...EXAMPLE_BRAND_SEED,
    orgSlug: "bite-club",
    orgName: "Bite Club",
  };

  console.log("Seeding Bite Club brand profile...");
  console.log(`  Target: ${BASE_URL}/api/brand`);
  console.log(`  Org: ${payload.orgSlug} (${payload.orgName})`);
  console.log(`  Messaging Pillars: ${payload.messagingPillars.length}`);
  console.log(`  Content Pillars: ${payload.contentPillars.length}`);
  console.log(`  Pain Points: ${payload.targetAudience.painPoints.length}`);
  console.log(`  Goals: ${payload.targetAudience.goals.length}`);
  console.log(`  Competitors: ${payload.competitors.length}`);
  console.log(`  Hashtags: ${payload.hashtags.length}`);

  try {
    const response = await fetch(`${BASE_URL}/api/brand`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`\nFailed: ${response.status} ${response.statusText}`);
      console.error(errorBody);
      process.exit(1);
    }

    const result = await response.json();
    console.log("\nBrand profile seeded successfully!");
    console.log(`  Org ID: ${result.org?.id}`);
    console.log(`  Profile ID: ${result.profile?.id}`);
    console.log(`  Brand Name: ${result.profile?.name}`);
  } catch (error) {
    if (error instanceof TypeError && String(error).includes("fetch")) {
      console.error(
        `\nConnection failed. Is the dev server running at ${BASE_URL}?`
      );
      console.error("Start it with: npx next dev");
    } else {
      console.error("\nUnexpected error:", error);
    }
    process.exit(1);
  }
}

main();
