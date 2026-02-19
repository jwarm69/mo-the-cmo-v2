/**
 * Link a Supabase user to an organization by updating their user_profiles row.
 *
 * Usage:
 *   npx tsx scripts/link-user-to-org.ts <email> [org-slug]
 *
 * Examples:
 *   npx tsx scripts/link-user-to-org.ts jack@example.com bite-club
 *   npx tsx scripts/link-user-to-org.ts jack@example.com          # defaults to bite-club
 *
 * Requires DATABASE_URL in .env.local or environment.
 */

import fs from "fs";
import path from "path";
import postgres from "postgres";

function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env.local");
  try {
    const content = fs.readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const match = line.match(/^([A-Z_]+)=["']?(.+?)["']?$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2];
      }
    }
  } catch {
    // ignore
  }
}

async function main() {
  loadEnv();

  const email = process.argv[2];
  const orgSlug = process.argv[3] ?? "bite-club";

  if (!email) {
    console.error("Usage: npx tsx scripts/link-user-to-org.ts <email> [org-slug]");
    process.exit(1);
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("Error: DATABASE_URL not found. Check .env.local");
    process.exit(1);
  }

  const sql = postgres(databaseUrl);

  try {
    // Find the org
    const orgs = await sql`
      SELECT id, slug, name FROM organizations WHERE slug = ${orgSlug} LIMIT 1
    `;
    if (orgs.length === 0) {
      console.error(`Error: Organization "${orgSlug}" not found.`);
      console.log("\nAvailable organizations:");
      const allOrgs = await sql`SELECT slug, name FROM organizations ORDER BY name`;
      for (const o of allOrgs) {
        console.log(`  - ${o.slug} (${o.name})`);
      }
      process.exit(1);
    }
    const org = orgs[0];

    // Find the user profile by email
    const profiles = await sql`
      SELECT id, email, org_id FROM user_profiles WHERE email = ${email} LIMIT 1
    `;

    if (profiles.length === 0) {
      // Check if user exists in auth.users but profile wasn't created
      const authUsers = await sql`
        SELECT id, email FROM auth.users WHERE email = ${email} LIMIT 1
      `;
      if (authUsers.length === 0) {
        console.error(`Error: No user found with email "${email}".`);
        process.exit(1);
      }

      // Create the profile and link to org
      const authUser = authUsers[0];
      await sql`
        INSERT INTO user_profiles (id, email, org_id, usage_limit_cents)
        VALUES (${authUser.id}, ${authUser.email}, ${org.id}, 50)
        ON CONFLICT (id) DO UPDATE SET org_id = ${org.id}, updated_at = NOW()
      `;
      console.log(`Created profile for ${email} and linked to ${org.name} (${org.slug})`);
    } else {
      const profile = profiles[0];
      if (profile.org_id === org.id) {
        console.log(`User ${email} is already linked to ${org.name} (${org.slug})`);
        process.exit(0);
      }

      await sql`
        UPDATE user_profiles SET org_id = ${org.id}, updated_at = NOW() WHERE id = ${profile.id}
      `;
      console.log(`Linked ${email} to ${org.name} (${org.slug})`);
    }

    console.log(`  Org ID: ${org.id}`);
    console.log(`  Org Slug: ${org.slug}`);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
