/**
 * Bite Club Brain → Mo the CMO Sync Script
 *
 * Reads structured YAML files from ~/bite-club-brain/graph/ and populates
 * Mo's Company Brain (context_entries), Customer Profiles, and GTM Channels.
 *
 * Idempotent — uses sourceId-based dedup, safe to re-run.
 *
 * Usage:
 *   npx tsx scripts/sync-brain-to-mo.ts
 *
 * Requires: DATABASE_URL and OPENAI_API_KEY in env (or .env.local for DATABASE_URL).
 */

import fs from "fs";
import path from "path";
import { parse as parseYaml } from "yaml";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, and, sql } from "drizzle-orm";
import { embed } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import * as schema from "../src/lib/db/schema";

// ── Env setup ────────────────────────────────────────────────────────────

function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env.local");
  try {
    const content = fs.readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx < 0) continue;
      const key = trimmed.slice(0, eqIdx);
      let val = trimmed.slice(eqIdx + 1);
      // Strip surrounding quotes
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  } catch {
    // .env.local not found — rely on system env
  }
}

loadEnv();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("Error: DATABASE_URL not set");
  process.exit(1);
}

// ── Database client ──────────────────────────────────────────────────────

const client = postgres(DATABASE_URL, { prepare: false });
const db = drizzle(client, { schema });

// ── Embedding helper ─────────────────────────────────────────────────────

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
const embeddingModel = openai.embedding("text-embedding-3-small");

async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const value = text.trim().slice(0, 8000);
    if (!value) return null;
    const { embedding: emb } = await embed({ model: embeddingModel, value });
    return emb;
  } catch (e) {
    console.warn("  ⚠ Embedding failed, storing without vector:", (e as Error).message);
    return null;
  }
}

// ── YAML loader ──────────────────────────────────────────────────────────

const BRAIN_DIR = path.join(process.env.HOME ?? "~", "bite-club-brain", "graph");

function loadYaml<T>(filename: string): T[] {
  const filePath = path.join(BRAIN_DIR, filename);
  const raw = fs.readFileSync(filePath, "utf-8");
  return parseYaml(raw) as T[];
}

// ── Content formatters (dense prose for vector search) ───────────────────

interface ICP {
  id: string;
  name: string;
  priority: string;
  coreEmotion: string;
  painPoints: string[];
  hookPatterns: string[];
  funnelEntry: string;
  channels: string[];
  demographics: string;
  battleMessage: string;
  headlineFormulas?: string[];
}

function formatICP(icp: ICP): string {
  const parts = [
    `${icp.name} — "${icp.coreEmotion}". ${icp.demographics}.`,
    `Pain points: ${icp.painPoints.join("; ")}.`,
    `Hook patterns: ${icp.hookPatterns.map((h) => `"${h}"`).join("; ")}.`,
  ];
  if (icp.headlineFormulas?.length) {
    parts.push(`Headline formulas: ${icp.headlineFormulas.join("; ")}.`);
  }
  parts.push(`Battle message: "${icp.battleMessage}".`);
  parts.push(`Channels: ${icp.channels.join(", ")}. Funnel entry: ${icp.funnelEntry}. Priority: ${icp.priority}.`);
  return parts.join("\n");
}

interface Competitor {
  id: string;
  name: string;
  type: string;
  marketShare: string;
  weakness: string[];
  strength: string[];
  pricingModel: string;
  avgFees: string;
  ufPresence: string;
  socialPresence?: string;
}

function formatCompetitor(c: Competitor): string {
  const parts = [
    `${c.name} (${c.type}). Market share: ${c.marketShare}. UF presence: ${c.ufPresence}.`,
    `Pricing: ${c.pricingModel}. Average fees: ${c.avgFees}.`,
    `Weaknesses: ${c.weakness.join("; ")}.`,
    `Strengths: ${c.strength.join("; ")}.`,
  ];
  if (c.socialPresence) parts.push(`Social: ${c.socialPresence}.`);
  return parts.join("\n");
}

interface Channel {
  id: string;
  name: string;
  type: string;
  budgetMonthly: number;
  budgetPercent?: number;
  frequency: string;
  primaryMetric: string;
  icpReach: string[];
  contentFocus?: string;
  bestTimes?: string[];
  bestDays?: string[];
  targeting?: Record<string, unknown>;
  campaignSplit?: Record<string, string>;
  tiers?: Record<string, unknown>;
  tactics?: string[];
  segments?: string[];
  locations?: string[];
  props?: string[];
  targetProfile?: string;
}

function formatChannel(ch: Channel): string {
  const parts = [
    `${ch.name} (${ch.type}). Budget: $${ch.budgetMonthly}/month. Frequency: ${ch.frequency}.`,
    `Primary metric: ${ch.primaryMetric}. Reaches ICPs: ${ch.icpReach.join(", ")}.`,
  ];
  if (ch.contentFocus) parts.push(`Content focus: ${ch.contentFocus}.`);
  if (ch.bestTimes) parts.push(`Best times: ${ch.bestTimes.join(", ")}.`);
  if (ch.bestDays) parts.push(`Best days: ${ch.bestDays.join(", ")}.`);
  if (ch.targeting) parts.push(`Targeting: ${JSON.stringify(ch.targeting)}.`);
  if (ch.tactics) parts.push(`Tactics: ${ch.tactics.join("; ")}.`);
  if (ch.segments) parts.push(`Segments: ${ch.segments.join("; ")}.`);
  if (ch.locations) parts.push(`Locations: ${ch.locations.join("; ")}.`);
  if (ch.tiers) parts.push(`Tiers: ${JSON.stringify(ch.tiers)}.`);
  return parts.join("\n");
}

interface ContentSeries {
  id: string;
  name: string;
  format: string;
  duration: string;
  hook: string;
  goal: string;
  frequency: string;
  targetICP: string[];
  channels: string[];
  priority: string;
  structure: string[];
  calendarDay: string;
  notes?: string;
}

function formatContentSeries(cs: ContentSeries): string {
  const parts = [
    `${cs.name} — ${cs.format}. Duration: ${cs.duration}. Frequency: ${cs.frequency}. Priority: ${cs.priority}.`,
    `Hook: "${cs.hook}". Goal: ${cs.goal}.`,
    `Target ICPs: ${cs.targetICP.join(", ")}. Channels: ${cs.channels.join(", ")}. Calendar day: ${cs.calendarDay}.`,
    `Structure: ${cs.structure.join(" → ")}.`,
  ];
  if (cs.notes) parts.push(`Notes: ${cs.notes}.`);
  return parts.join("\n");
}

interface FunnelStage {
  id: string;
  name: string;
  goal: string;
  triggers: string[];
  contentStyle: string;
  channels: string[];
  metrics: string[];
  convertsTo: string;
  offer?: string;
  offers?: string[];
  mechanisms?: string[];
}

function formatFunnel(f: FunnelStage): string {
  const parts = [
    `${f.name} stage. Goal: ${f.goal}. Converts to: ${f.convertsTo}.`,
    `Triggers: ${f.triggers.join("; ")}. Content style: ${f.contentStyle}.`,
    `Channels: ${f.channels.join(", ")}. Metrics: ${f.metrics.join("; ")}.`,
  ];
  if (f.offer) parts.push(`Offer: ${f.offer}.`);
  if (f.offers) parts.push(`Offers: ${f.offers.join("; ")}.`);
  if (f.mechanisms) parts.push(`Mechanisms: ${f.mechanisms.join("; ")}.`);
  return parts.join("\n");
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  type: string;
  location: string;
  status: string;
  responsibilities: string[];
  hoursPerWeek?: number | null;
  notes: string;
}

function formatTeam(t: TeamMember): string {
  return [
    `${t.name} — ${t.role} (${t.type}, ${t.status}). Location: ${t.location}.`,
    `Responsibilities: ${t.responsibilities.join("; ")}.`,
    t.hoursPerWeek ? `Hours/week: ${t.hoursPerWeek}.` : "",
    `Notes: ${t.notes}.`,
  ].filter(Boolean).join("\n");
}

interface Location {
  id: string;
  name: string;
  type: string;
  address: string;
  studentDensity: string;
  distanceToCampus: string;
  units?: number;
  notes: string;
}

function formatLocation(l: Location): string {
  const parts = [
    `${l.name} (${l.type}). Address: ${l.address}. Distance to campus: ${l.distanceToCampus}. Student density: ${l.studentDensity}.`,
  ];
  if (l.units) parts.push(`Units: ${l.units}.`);
  parts.push(`Notes: ${l.notes}.`);
  return parts.join("\n");
}

// ── Resolve org ──────────────────────────────────────────────────────────

async function resolveOrgId(): Promise<string> {
  const [org] = await db
    .select({ id: schema.organizations.id })
    .from(schema.organizations)
    .where(eq(schema.organizations.slug, "bite-club"))
    .limit(1);

  if (!org) {
    console.error("Error: No organization with slug 'bite-club' found.");
    console.error("Run the seed-brand script first: npx tsx scripts/seed-brand.ts");
    process.exit(1);
  }
  return org.id;
}

// ── Dedup check ──────────────────────────────────────────────────────────

async function existingSourceIds(orgId: string, prefix: string): Promise<Set<string>> {
  const rows = await db
    .select({ sourceId: schema.contextEntries.sourceId })
    .from(schema.contextEntries)
    .where(
      and(
        eq(schema.contextEntries.orgId, orgId),
        sql`${schema.contextEntries.sourceId} LIKE ${prefix + "%"}`
      )
    );
  return new Set(rows.map((r) => r.sourceId).filter(Boolean) as string[]);
}

// ── Brain entry insertion (with embedding + dedup) ───────────────────────

interface BrainEntry {
  type: schema.ContextEntry["type"];
  title: string;
  content: string;
  sourceId: string;
  metadata?: Record<string, unknown>;
}

async function syncBrainEntries(orgId: string, entries: BrainEntry[]) {
  const existing = await existingSourceIds(orgId, "brain-sync:");
  const toInsert = entries.filter((e) => !existing.has(e.sourceId));

  if (toInsert.length === 0) {
    console.log(`  ↳ All ${entries.length} entries already exist, skipping.`);
    return;
  }

  console.log(`  ↳ Inserting ${toInsert.length} new entries (${existing.size} already exist)...`);

  // Process in batches of 5 to respect rate limits
  for (let i = 0; i < toInsert.length; i += 5) {
    const batch = toInsert.slice(i, i + 5);
    await Promise.all(
      batch.map(async (entry) => {
        const embeddingText = `${entry.title}: ${entry.content}`.slice(0, 8000);
        const embedding = await generateEmbedding(embeddingText);
        await db.insert(schema.contextEntries).values({
          orgId,
          type: entry.type,
          title: entry.title,
          content: entry.content,
          source: "brain-sync",
          sourceId: entry.sourceId,
          embedding,
          confidence: 1.0,
          metadata: entry.metadata,
        });
        process.stdout.write(".");
      })
    );
  }
  console.log(" done.");
}

// ── Customer Profile sync ────────────────────────────────────────────────

async function syncCustomerProfiles(orgId: string, icps: ICP[]) {
  console.log("\n📊 Syncing Customer Profiles...");

  for (const icp of icps) {
    // Check if profile already exists by name
    const [existing] = await db
      .select({ id: schema.customerProfiles.id })
      .from(schema.customerProfiles)
      .where(
        and(
          eq(schema.customerProfiles.orgId, orgId),
          eq(schema.customerProfiles.name, icp.name)
        )
      )
      .limit(1);

    if (existing) {
      console.log(`  ↳ "${icp.name}" already exists, skipping.`);
      continue;
    }

    await db.insert(schema.customerProfiles).values({
      orgId,
      name: icp.name,
      isPrimary: icp.priority === "high",
      status: "active",
      demographics: {
        age: icp.demographics.match(/(\d+-\d+)/)?.[1],
        occupation: icp.demographics,
        location: "Gainesville, FL (UF campus)",
      },
      psychographics: {
        values: [icp.coreEmotion],
        lifestyle: icp.demographics,
      },
      painPoints: icp.painPoints,
      goals: [icp.battleMessage],
      objections: [],
      buyingTriggers: icp.hookPatterns.slice(0, 3),
      preferredChannels: icp.channels,
      messagingAngle: icp.coreEmotion,
      evidence: `Source: bite-club-brain/graph/icps.yaml. Priority: ${icp.priority}. Funnel entry: ${icp.funnelEntry}.`,
      metadata: {
        brainSyncId: icp.id,
        hookPatterns: icp.hookPatterns,
        headlineFormulas: icp.headlineFormulas,
        funnelEntry: icp.funnelEntry,
        battleMessage: icp.battleMessage,
      },
    });
    console.log(`  ✓ Created "${icp.name}" (primary: ${icp.priority === "high"})`);
  }
}

// ── GTM Channel sync ─────────────────────────────────────────────────────

function mapChannelCategory(type: string): string {
  switch (type) {
    case "organic": return "digital";
    case "paid": return "digital";
    case "offline": return "physical";
    case "partnership": return "partnership";
    default: return "digital";
  }
}

async function syncGtmChannels(orgId: string, channels: Channel[]) {
  console.log("\n📡 Syncing GTM Channels...");

  for (const ch of channels) {
    // Check if channel already exists (unique index on orgId + channel)
    const [existing] = await db
      .select({ id: schema.gtmChannels.id })
      .from(schema.gtmChannels)
      .where(
        and(
          eq(schema.gtmChannels.orgId, orgId),
          eq(schema.gtmChannels.channel, ch.id)
        )
      )
      .limit(1);

    if (existing) {
      console.log(`  ↳ "${ch.name}" already exists, skipping.`);
      continue;
    }

    const rationale = [
      `${ch.name} (${ch.type}). Budget: $${ch.budgetMonthly}/month.`,
      `Frequency: ${ch.frequency}. Primary metric: ${ch.primaryMetric}.`,
      `Reaches: ${ch.icpReach.join(", ")}.`,
    ].join(" ");

    await db.insert(schema.gtmChannels).values({
      orgId,
      channel: ch.id,
      channelCategory: mapChannelCategory(ch.type),
      status: "planned",
      priority: ch.budgetMonthly > 0 ? 2 : 3,
      rationale,
      notes: ch.contentFocus ?? null,
      metadata: {
        brainSyncName: ch.name,
        type: ch.type,
        budgetMonthly: ch.budgetMonthly,
        frequency: ch.frequency,
        primaryMetric: ch.primaryMetric,
        icpReach: ch.icpReach,
      },
    });
    console.log(`  ✓ Created "${ch.name}" (priority: ${ch.budgetMonthly > 0 ? 2 : 3})`);
  }
}

// ── Main ─────────────────────────────────────────────────────────────────

async function main() {
  console.log("🧠 Bite Club Brain → Mo the CMO Sync");
  console.log(`   Source: ${BRAIN_DIR}`);
  console.log("");

  // Resolve org
  const orgId = await resolveOrgId();
  console.log(`✓ Org: bite-club (${orgId})\n`);

  // ── Load all YAML ──
  const icps = loadYaml<ICP>("icps.yaml");
  const competitors = loadYaml<Competitor>("competitors.yaml");
  const channels = loadYaml<Channel>("channels.yaml");
  const contentSeries = loadYaml<ContentSeries>("content-series.yaml");
  const funnels = loadYaml<FunnelStage>("funnels.yaml");
  const team = loadYaml<TeamMember>("team.yaml");
  const locations = loadYaml<Location>("locations.yaml");

  console.log(`Loaded: ${icps.length} ICPs, ${competitors.length} competitors, ${channels.length} channels,`);
  console.log(`        ${contentSeries.length} content series, ${funnels.length} funnels, ${team.length} team, ${locations.length} locations`);

  // ── Layer 1: Company Brain (context_entries) ──

  console.log("\n🧠 Syncing Company Brain entries...");

  const brainEntries: BrainEntry[] = [];

  // ICPs → audience_insight
  console.log("\n  ICPs → audience_insight");
  for (const icp of icps) {
    brainEntries.push({
      type: "audience_insight",
      title: `ICP: ${icp.name}`,
      content: formatICP(icp),
      sourceId: `brain-sync:icps:${icp.id}`,
      metadata: { yamlFile: "icps.yaml", nodeId: icp.id, priority: icp.priority },
    });
  }

  // Competitors → market_insight
  console.log("  Competitors → market_insight");
  for (const c of competitors) {
    brainEntries.push({
      type: "market_insight",
      title: `Competitor: ${c.name}`,
      content: formatCompetitor(c),
      sourceId: `brain-sync:competitors:${c.id}`,
      metadata: { yamlFile: "competitors.yaml", nodeId: c.id, type: c.type },
    });
  }

  // Channels → strategy_decision
  console.log("  Channels → strategy_decision");
  for (const ch of channels) {
    brainEntries.push({
      type: "strategy_decision",
      title: `Channel: ${ch.name}`,
      content: formatChannel(ch),
      sourceId: `brain-sync:channels:${ch.id}`,
      metadata: { yamlFile: "channels.yaml", nodeId: ch.id, type: ch.type },
    });
  }

  // Content Series → plan_context
  console.log("  Content Series → plan_context");
  for (const cs of contentSeries) {
    brainEntries.push({
      type: "plan_context",
      title: `Content Series: ${cs.name}`,
      content: formatContentSeries(cs),
      sourceId: `brain-sync:content-series:${cs.id}`,
      metadata: { yamlFile: "content-series.yaml", nodeId: cs.id, priority: cs.priority },
    });
  }

  // Funnels → strategy_decision
  console.log("  Funnels → strategy_decision");
  for (const f of funnels) {
    brainEntries.push({
      type: "strategy_decision",
      title: `Funnel Stage: ${f.name}`,
      content: formatFunnel(f),
      sourceId: `brain-sync:funnels:${f.id}`,
      metadata: { yamlFile: "funnels.yaml", nodeId: f.id },
    });
  }

  // Team → business_info
  console.log("  Team → business_info");
  for (const t of team) {
    brainEntries.push({
      type: "business_info",
      title: `Team: ${t.name} — ${t.role}`,
      content: formatTeam(t),
      sourceId: `brain-sync:team:${t.id}`,
      metadata: { yamlFile: "team.yaml", nodeId: t.id, status: t.status },
    });
  }

  // Locations → business_info
  console.log("  Locations → business_info");
  for (const l of locations) {
    brainEntries.push({
      type: "business_info",
      title: `Location: ${l.name}`,
      content: formatLocation(l),
      sourceId: `brain-sync:locations:${l.id}`,
      metadata: { yamlFile: "locations.yaml", nodeId: l.id, type: l.type },
    });
  }

  console.log(`\n  Total brain entries to sync: ${brainEntries.length}`);
  await syncBrainEntries(orgId, brainEntries);

  // ── Layer 2: Customer Profiles ──
  await syncCustomerProfiles(orgId, icps);

  // ── Layer 3: GTM Channels ──
  await syncGtmChannels(orgId, channels);

  // ── Summary ──
  console.log("\n" + "═".repeat(50));
  console.log("✅ Sync complete!");
  console.log("");

  // Count what's in the DB now
  const brainCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.contextEntries)
    .where(
      and(
        eq(schema.contextEntries.orgId, orgId),
        eq(schema.contextEntries.source, "brain-sync")
      )
    );

  const profileCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.customerProfiles)
    .where(eq(schema.customerProfiles.orgId, orgId));

  const channelCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.gtmChannels)
    .where(eq(schema.gtmChannels.orgId, orgId));

  console.log(`  Brain entries:     ${brainCount[0].count}`);
  console.log(`  Customer profiles: ${profileCount[0].count}`);
  console.log(`  GTM channels:      ${channelCount[0].count}`);
  console.log("");

  // Close the connection
  await client.end();
}

main().catch((err) => {
  console.error("\n❌ Fatal error:", err);
  process.exit(1);
});
