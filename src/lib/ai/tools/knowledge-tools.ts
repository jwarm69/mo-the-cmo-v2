import { z } from "zod";
import { zodSchema, type Tool } from "ai";
import { searchKnowledge } from "@/lib/rag/search";
import { searchBrain, formatBrainContext } from "@/lib/brain/context-brain";

export function createKnowledgeTools(orgId: string, orgSlug?: string): Record<string, Tool> {
  return {
    search_knowledge: {
      description:
        "Search the knowledge base for relevant information. Use this when you need specific facts, data, or context from uploaded documents.",
      inputSchema: zodSchema(
        z.object({
          query: z.string().describe("The search query"),
        })
      ),
      execute: async ({ query }: { query: string }) => {
        const results = await searchKnowledge(orgId, query, 5, orgSlug);
        if (results.length === 0) {
          return { results: [], message: "No relevant knowledge found." };
        }
        return {
          results: results.map((r) => ({
            document: r.documentTitle,
            content: r.content,
          })),
          message: `Found ${results.length} relevant knowledge entries.`,
        };
      },
    },

    search_brain: {
      description:
        "Search Mo's company brain — the accumulated knowledge from conversations, decisions, and learnings about this business.",
      inputSchema: zodSchema(
        z.object({
          query: z.string().describe("The search query"),
        })
      ),
      execute: async ({ query }: { query: string }) => {
        const results = await searchBrain(orgId, query, 5);
        if (results.length === 0) {
          return { results: [], message: "No relevant context found in brain." };
        }
        return {
          summary: formatBrainContext(results),
          count: results.length,
          message: `Found ${results.length} relevant brain entries.`,
        };
      },
    },
  };
}
