/**
 * Short-term memory: session-level context.
 * Lives in React state on the client.
 * Sprint 1: Stub for architecture completeness.
 * Sprint 6: Full implementation with context windowing.
 */

export interface SessionContext {
  conversationId: string;
  activeCampaignId?: string;
  lastContentPillar?: string;
  recentTopics: string[];
}

export function createSessionContext(): SessionContext {
  return {
    conversationId: crypto.randomUUID(),
    recentTopics: [],
  };
}

export function addTopic(ctx: SessionContext, topic: string): SessionContext {
  return {
    ...ctx,
    recentTopics: [...ctx.recentTopics.slice(-9), topic],
  };
}
