import type { Tool } from "ai";
import { createContentTools } from "./content-tools";
import { createPlanningTools } from "./planning-tools";
import { createKnowledgeTools } from "./knowledge-tools";

export function createMoTools(orgId: string, orgSlug?: string): Record<string, Tool> {
  return {
    ...createContentTools(orgId),
    ...createPlanningTools(orgId),
    ...createKnowledgeTools(orgId, orgSlug),
  };
}
