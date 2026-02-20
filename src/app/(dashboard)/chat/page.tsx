import { ChatInterface } from "@/components/chat/chat-interface";

export default function ChatPage() {
  return (
    <div className="flex h-[calc(100vh-8rem)] md:h-[calc(100vh-8rem)] flex-col">
      <div className="mb-2 md:mb-4">
        <h2 className="text-xl md:text-2xl font-bold tracking-tight">Chat with Mo</h2>
        <p className="text-sm md:text-base text-muted-foreground">
          Your AI CMO is ready. Ask anything about marketing strategy,
          content creation, or campaign planning.
        </p>
      </div>
      <div className="flex-1 overflow-hidden min-h-0">
        <ChatInterface />
      </div>
    </div>
  );
}
