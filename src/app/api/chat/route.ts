import { streamText, type UIMessage, convertToModelMessages } from "ai";
import { inferTaskType, routeTask } from "@/lib/ai/model-router";
import { buildContextualPrompt } from "@/lib/ai/prompts/system";

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  // Extract text from the last message's parts for task routing
  const lastMessage = messages[messages.length - 1];
  const lastText =
    lastMessage?.parts
      ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join(" ") || "";

  const taskType = inferTaskType(lastText);
  const model = routeTask(taskType);
  const systemPrompt = buildContextualPrompt();

  const result = streamText({
    model,
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
