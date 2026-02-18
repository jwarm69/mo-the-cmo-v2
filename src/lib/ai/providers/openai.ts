import { createOpenAI } from "@ai-sdk/openai";

export const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const gpt4o = openai("gpt-4o");
export const gpt4oMini = openai("gpt-4o-mini");
export const embeddingModel = openai.embedding("text-embedding-3-small");
