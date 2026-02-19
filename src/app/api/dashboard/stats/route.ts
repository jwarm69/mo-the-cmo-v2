import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/session";
import { resolveOrgFromRequest } from "@/lib/api/org";
import { db } from "@/lib/db/client";
import { contentItems, agentLearnings, knowledgeDocuments } from "@/lib/db/schema";
import { count, eq, and, gte, sql } from "drizzle-orm";

export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { user } = auth;

  const org = await resolveOrgFromRequest(req, undefined, user.orgId);

  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const [
    contentThisMonthResult,
    scheduledResult,
    pendingApprovalResult,
    learningsResult,
    knowledgeDocsResult,
  ] = await Promise.all([
    db
      .select({ value: count() })
      .from(contentItems)
      .where(
        and(
          eq(contentItems.orgId, org.id),
          gte(contentItems.createdAt, startOfMonth)
        )
      ),
    db
      .select({ value: count() })
      .from(contentItems)
      .where(
        and(
          eq(contentItems.orgId, org.id),
          eq(contentItems.status, "scheduled")
        )
      ),
    db
      .select({ value: count() })
      .from(contentItems)
      .where(
        and(
          eq(contentItems.orgId, org.id),
          sql`(${contentItems.status} = 'draft' OR ${contentItems.status} = 'pending_approval')`
        )
      ),
    db
      .select({ value: count() })
      .from(agentLearnings)
      .where(eq(agentLearnings.orgId, org.id)),
    db
      .select({ value: count() })
      .from(knowledgeDocuments)
      .where(eq(knowledgeDocuments.orgId, org.id)),
  ]);

  return NextResponse.json({
    contentThisMonth: contentThisMonthResult[0].value,
    scheduled: scheduledResult[0].value,
    pendingApproval: pendingApprovalResult[0].value,
    learnings: learningsResult[0].value,
    knowledgeDocs: knowledgeDocsResult[0].value,
  });
}
