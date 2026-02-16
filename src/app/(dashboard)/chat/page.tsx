import { ChatInterface } from "@/components/chat/chat-interface";

export default function ChatPage() {
  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <div className="mb-4">
        <h2 className="text-2xl font-bold tracking-tight">Chat with Mo</h2>
        <p className="text-muted-foreground">
          Your AI CMO is ready. Ask anything about marketing strategy,
          content creation, or campaign planning.
        </p>
      </div>
      <div className="flex-1 overflow-hidden">
        <ChatInterface />
      </div>
    </div>
  );
}
