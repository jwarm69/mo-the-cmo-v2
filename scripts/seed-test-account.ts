/**
 * Seed script: create a test account (test@test.com / test) linked to the
 * Bite Club org with all existing brand data. Idempotent — safe to re-run.
 *
 * Usage: npx tsx scripts/seed-test-account.ts
 */

import fs from "fs";
import path from "path";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";
import * as schema from "../src/lib/db/schema";
import { EXAMPLE_BRAND_SEED } from "../src/lib/seed/bite-club";

const TEST_EMAIL = "test@test.com";
const TEST_PASSWORD = "test";
const ORG_SLUG = "bite-club";
const ORG_NAME = "Bite Club";

function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env.local");
  try {
    const content = fs.readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.+)$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].trim();
      }
    }
  } catch {
    // ignore
  }
}

async function main() {
  loadEnv();

  const databaseUrl = process.env.DATABASE_URL;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!databaseUrl || !supabaseUrl || !serviceRoleKey) {
    console.error(
      "Missing required env vars: DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY"
    );
    console.error("Ensure these are set in .env.local");
    process.exit(1);
  }

  // Set up clients
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const client = postgres(databaseUrl, { prepare: false });
  const db = drizzle(client, { schema });

  // 1. Create or reset auth user
  console.log(`\n1. Creating auth user: ${TEST_EMAIL}`);

  // Check if user already exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find(
    (u) => u.email === TEST_EMAIL
  );

  let userId: string;

  if (existingUser) {
    userId = existingUser.id;
    console.log(`   User already exists (${userId}), resetting password...`);
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      password: TEST_PASSWORD,
      email_confirm: true,
    });
    if (error) {
      console.error("   Failed to reset password:", error.message);
      process.exit(1);
    }
    console.log("   Password reset to 'test'");
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
    });
    if (error) {
      console.error("   Failed to create user:", error.message);
      process.exit(1);
    }
    userId = data.user.id;
    console.log(`   Created user: ${userId}`);
  }

  // 2. Ensure org exists
  console.log(`\n2. Ensuring org "${ORG_SLUG}" exists...`);

  let [orgRow] = await db
    .select({ id: schema.organizations.id })
    .from(schema.organizations)
    .where(eq(schema.organizations.slug, ORG_SLUG))
    .limit(1);

  if (!orgRow) {
    [orgRow] = await db
      .insert(schema.organizations)
      .values({ slug: ORG_SLUG, name: ORG_NAME })
      .returning({ id: schema.organizations.id });
    console.log(`   Created org: ${orgRow.id}`);
  } else {
    console.log(`   Org exists: ${orgRow.id}`);
  }

  const orgId = orgRow.id;

  // 3. Ensure user_profiles row exists and is linked to the org
  console.log("\n3. Ensuring user profile is linked to org...");

  const [existingProfile] = await db
    .select({ id: schema.userProfiles.id })
    .from(schema.userProfiles)
    .where(eq(schema.userProfiles.id, userId))
    .limit(1);

  if (existingProfile) {
    await db
      .update(schema.userProfiles)
      .set({ orgId, email: TEST_EMAIL, displayName: "Test User" })
      .where(eq(schema.userProfiles.id, userId));
    console.log("   Updated existing profile");
  } else {
    await db.insert(schema.userProfiles).values({
      id: userId,
      email: TEST_EMAIL,
      displayName: "Test User",
      orgId,
    });
    console.log("   Created new profile");
  }

  // 4. Ensure brand profile exists for the org
  console.log("\n4. Ensuring brand profile exists...");

  const [existingBrand] = await db
    .select({ id: schema.brandProfiles.id })
    .from(schema.brandProfiles)
    .where(eq(schema.brandProfiles.orgId, orgId))
    .limit(1);

  if (existingBrand) {
    console.log(`   Brand profile exists: ${existingBrand.id}`);
  } else {
    const [brand] = await db
      .insert(schema.brandProfiles)
      .values({
        orgId,
        name: EXAMPLE_BRAND_SEED.name,
        voice: EXAMPLE_BRAND_SEED.voice,
        tone: EXAMPLE_BRAND_SEED.tone,
        messagingPillars: EXAMPLE_BRAND_SEED.messagingPillars,
        contentPillars: EXAMPLE_BRAND_SEED.contentPillars,
        targetAudience: EXAMPLE_BRAND_SEED.targetAudience,
        brandGuidelines: EXAMPLE_BRAND_SEED.brandGuidelines,
        competitors: EXAMPLE_BRAND_SEED.competitors,
        hashtags: EXAMPLE_BRAND_SEED.hashtags,
      })
      .returning({ id: schema.brandProfiles.id });
    console.log(`   Created brand profile: ${brand.id}`);
  }

  // Done
  console.log("\n--- Seed Complete ---");
  console.log(`  Email:    ${TEST_EMAIL}`);
  console.log(`  Password: ${TEST_PASSWORD}`);
  console.log(`  Org:      ${ORG_NAME} (${ORG_SLUG})`);
  console.log(`  Org ID:   ${orgId}`);
  console.log(`  User ID:  ${userId}`);
  console.log("\nLogin at: http://localhost:3000/login");

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
